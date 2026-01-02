import { App, ExpressReceiver } from '@slack/bolt';
import { KnownBlock } from '@slack/types';
import { kv } from '@vercel/kv';
import { logger } from '../../utils/logger';
import { ActionItem } from '../../types/action-item';
import { LinearIssueInput } from '../../types/linear';
import { FathomWebhookPayload } from '../../types/fathom';

interface ReviewRequestData {
  actionItems: ActionItem[];
  linearIssues: LinearIssueInput[];
  timestamp: number;
  messageTs?: string;
  channelId?: string;
  approvedIssues?: number[]; // Track which issue indices have been approved (array for JSON serialization)
  rejectedIssues?: number[]; // Track which issue indices have been rejected (array for JSON serialization)
}

export class SlackReviewer {
  private app: App;
  private receiver: ExpressReceiver;
  private channelId: string;
  private useKV: boolean;
  private reviewTimeout: number = 30 * 60 * 1000; // 30 minutes default
  private kvPrefix = 'slack-review:'; // Prefix for KV keys
  private linearCreator?: any; // Will be set via setLinearCreator method

  constructor(botToken: string, signingSecret: string, channelId: string, useKV: boolean = false) {
    this.receiver = new ExpressReceiver({
      signingSecret,
      // ExpressReceiver handles /slack/events internally
      // The router should be mounted at the root, and it will handle /slack/events
    });
    
    this.app = new App({
      token: botToken,
      receiver: this.receiver,
    });
    
    this.channelId = channelId;
    this.useKV = useKV;
    this.setupHandlers();
  }

  // Set Linear creator after initialization (circular dependency workaround)
  setLinearCreator(linearCreator: any) {
    this.linearCreator = linearCreator;
  }

  // Get the Express router for mounting in the main server
  getRouter() {
    return this.receiver.router;
  }

  // KV helper methods
  private getKVKey(reviewId: string): string {
    return `${this.kvPrefix}${reviewId}`;
  }

  private async storeReviewKV(reviewId: string, data: ReviewRequestData): Promise<void> {
    if (!this.useKV) return;
    try {
      const key = this.getKVKey(reviewId);
      logger.info(`Storing review in KV with key: ${key}, reviewId: ${reviewId}`);
      // Ensure arrays are initialized
      if (!data.approvedIssues) data.approvedIssues = [];
      if (!data.rejectedIssues) data.rejectedIssues = [];
      await kv.set(key, data, { ex: Math.floor(this.reviewTimeout / 1000) }); // Store object directly
      logger.info(`Successfully stored review ${reviewId} in KV with key: ${key}`);
    } catch (error) {
      logger.error(`Failed to store review ${reviewId} in KV:`, error);
      throw error;
    }
  }

  private async getReviewKV(reviewId: string): Promise<ReviewRequestData | null> {
    if (!this.useKV) return null;
    try {
      const key = this.getKVKey(reviewId);
      logger.info(`Looking up review in KV with key: ${key}`);
      const data = await kv.get<ReviewRequestData | string>(key);
      if (!data) {
        logger.warn(`Review data not found in KV for key: ${key}`);
        return null;
      }
      logger.info(`Review data found in KV for key: ${key}`);
      
      // Vercel KV might return the object directly or as a string
      // If it's already an object, return it; otherwise parse it
      if (typeof data === 'string') {
        return JSON.parse(data) as ReviewRequestData;
      } else {
        return data as ReviewRequestData;
      }
    } catch (error) {
      logger.error(`Failed to get review ${reviewId} from KV:`, error);
      return null;
    }
  }

  private async deleteReviewKV(reviewId: string): Promise<void> {
    if (!this.useKV) return;
    try {
      const key = this.getKVKey(reviewId);
      await kv.del(key);
      logger.debug(`Deleted review ${reviewId} from KV`);
    } catch (error) {
      logger.error(`Failed to delete review ${reviewId} from KV:`, error);
    }
  }

  private setupHandlers() {
    this.app.action('approve_issues', async ({ ack, body, respond }) => {
      await ack();
      
      try {
        const actionBody = body as any;
        const reviewId = actionBody.actions[0]?.value;
        
        // Extract message info from action body immediately for instant UI feedback
        // According to Slack Bolt docs:
        // - body.message.ts contains the message timestamp
        // - body.channel.id contains the channel ID
        // - body.container.message_ts is also available as fallback
        const messageTs = actionBody.message?.ts || actionBody.container?.message_ts;
        const channelId = actionBody.channel?.id;
        
        logger.info(`Action body structure - message.ts: ${actionBody.message?.ts}, channel.id: ${actionBody.channel?.id}, container.message_ts: ${actionBody.container?.message_ts}`);
        
        if (!reviewId) {
          logger.error('No reviewId found in action body:', JSON.stringify(actionBody, null, 2));
          await respond({ text: '❌ Invalid review request.' });
          return;
        }
        
        logger.info(`Processing approval for reviewId: ${reviewId}, useKV: ${this.useKV}, messageTs: ${messageTs}, channelId: ${channelId}`);
        
        // IMMEDIATELY update the message to show processing state and remove buttons
        // This provides instant feedback and prevents multiple clicks
        if (messageTs && channelId) {
          try {
            await this.app.client.chat.update({
              channel: channelId,
              ts: messageTs,
              text: `⏳ Processing approval - Creating issues in Linear...`,
              blocks: this.createProcessingBlocks('⏳ Processing approval - Creating issues in Linear...'),
            });
            logger.info('Updated message to show processing state immediately');
          } catch (error) {
            logger.warn('Failed to update message to processing state:', error);
            // Continue anyway - send ephemeral response
            await respond({ text: '⏳ Processing approval - Creating issues in Linear...' });
          }
        } else {
          logger.warn('Missing messageTs or channelId in action body, cannot update message immediately');
          await respond({ text: '⏳ Processing approval - Creating issues in Linear...' });
        }
        
        // Get review data from KV or memory
        let reviewData: ReviewRequestData | null = null;
        
        if (this.useKV) {
          reviewData = await this.getReviewKV(reviewId);
        } else {
          // Fallback to in-memory storage (for local development)
          // This won't work in serverless, but helps with local testing
          if (messageTs && channelId) {
            await this.app.client.chat.update({
              channel: channelId,
              ts: messageTs,
              text: '❌ In-memory storage not available. Use KV for serverless deployment.',
              blocks: this.createErrorBlocks('❌ In-memory storage not available. Use KV for serverless deployment.'),
            });
          } else {
            await respond({ text: '❌ In-memory storage not available. Use KV for serverless deployment.' });
          }
          return;
        }

        if (!reviewData) {
          logger.error(`Review data not found for reviewId: ${reviewId}`);
          if (messageTs && channelId) {
            await this.app.client.chat.update({
              channel: channelId,
              ts: messageTs,
              text: `❌ Review not found or expired.`,
              blocks: this.createErrorBlocks('❌ Review not found or expired.'),
            });
          } else {
            await respond({ text: '❌ Review not found or expired.' });
          }
          return;
        }
        
        logger.info(`Review data found for reviewId: ${reviewId}, proceeding with issue creation`);

        // Create Linear issues
        if (this.linearCreator) {
          try {
            logger.info(`Attempting to create ${reviewData.linearIssues.length} issues in Linear...`);
            console.log(`[LINEAR] Starting to create ${reviewData.linearIssues.length} issues...`);
            const issueIds = await this.linearCreator.createIssues(reviewData.linearIssues);
            logger.info(`Created ${issueIds.length}/${reviewData.linearIssues.length} issues in Linear:`, issueIds);
            console.log(`[LINEAR] Created ${issueIds.length}/${reviewData.linearIssues.length} issues:`, issueIds);
            
            if (issueIds.length === 0) {
              // Update message to show error
              if (messageTs && channelId) {
                try {
                  await this.app.client.chat.update({
                    channel: channelId,
                    ts: messageTs,
                    text: `❌ Failed to create issues in Linear`,
                    blocks: this.createErrorBlocks('Failed to create issues in Linear. Please check logs.'),
                  });
                } catch (error) {
                  logger.warn('Failed to update message with error:', error);
                }
              }
              await respond({ 
                text: `❌ Failed to create issues in Linear. Please check logs.`,
                replace_original: false 
              });
              return;
            }
            
            // Update the original message with success
            if (messageTs && channelId) {
              try {
                await this.app.client.chat.update({
                  channel: channelId,
                  ts: messageTs,
                  text: `✅ Approved - Created ${issueIds.length} issue(s) in Linear`,
                  blocks: this.createApprovedBlocks(reviewData, issueIds.length),
                });
              } catch (error) {
                logger.warn('Failed to update original message:', error);
              }
            }
            
            await respond({ 
              text: `✅ Approved! Created ${issueIds.length} issue(s) in Linear.`,
              replace_original: false 
            });
            
            // Delete from KV
            await this.deleteReviewKV(reviewId);
            logger.info(`Review ${reviewId} approved and issues created`);
          } catch (error) {
            logger.error('Failed to create Linear issues:', error);
            console.error('[LINEAR] Failed to create Linear issues:', error);
            
            // Update message to show error
            if (messageTs && channelId) {
              try {
                await this.app.client.chat.update({
                  channel: channelId,
                  ts: messageTs,
                  text: `❌ Error creating issues in Linear`,
                  blocks: this.createErrorBlocks('Error creating issues in Linear. Please try again.'),
                });
              } catch (updateError) {
                logger.warn('Failed to update message with error:', updateError);
              }
            }
            
            await respond({ text: '❌ Error creating issues in Linear. Please try again.' });
          }
        } else {
          await respond({ text: '❌ Linear creator not configured.' });
        }
      } catch (error) {
        logger.error('Error handling approval:', error);
        await respond({ text: '❌ Error processing approval. Please try again.' });
      }
    });

    this.app.action('reject_issues', async ({ ack, body, respond }) => {
      await ack();
      
      try {
        const actionBody = body as any;
        const reviewId = actionBody.actions[0]?.value;
        
        // Extract message info from action body immediately for instant UI feedback
        // According to Slack Bolt docs: body.message.ts and body.channel.id
        const messageTs = actionBody.message?.ts || actionBody.container?.message_ts;
        const channelId = actionBody.channel?.id;
        
        if (!reviewId) {
          logger.error('No reviewId found in reject action body');
          await respond({ text: '❌ Invalid review request.' });
          return;
        }
        
        // IMMEDIATELY update the message to show processing state and remove buttons
        if (messageTs && channelId) {
          try {
            await this.app.client.chat.update({
              channel: channelId,
              ts: messageTs,
              text: `⏳ Processing rejection...`,
              blocks: this.createProcessingBlocks('⏳ Processing rejection...'),
            });
            logger.info('Updated message to show processing state for rejection');
          } catch (error) {
            logger.warn('Failed to update message to processing state for rejection:', error);
          }
        }
        
        // Get review data from KV
        let reviewData: ReviewRequestData | null = null;
        
        if (this.useKV) {
          reviewData = await this.getReviewKV(reviewId);
        }

        if (!reviewData) {
          if (messageTs && channelId) {
            await this.app.client.chat.update({
              channel: channelId,
              ts: messageTs,
              text: `❌ Review not found or expired.`,
              blocks: this.createErrorBlocks('❌ Review not found or expired.'),
            });
          } else {
            await respond({ text: '❌ Review not found or expired.' });
          }
          return;
        }

        // Update the original message
        if (messageTs && channelId) {
          try {
            await this.app.client.chat.update({
              channel: channelId,
              ts: messageTs,
              text: `❌ Rejected - Issues not created`,
              blocks: this.createRejectedBlocks(reviewData),
            });
          } catch (error) {
            logger.warn('Failed to update original message:', error);
          }
        }
        
        await respond({ text: '❌ Issue creation cancelled.' });
        
        // Delete from KV
        await this.deleteReviewKV(reviewId);
        logger.info(`Review ${reviewId} rejected`);
      } catch (error) {
        logger.error('Error handling rejection:', error);
        await respond({ text: '❌ Error processing rejection. Please try again.' });
      }
    });

    // Handler for individual issue approval
    this.app.action('approve_issue', async ({ ack, body, respond }) => {
      await ack();
      
      try {
        const actionBody = body as any;
        const value = actionBody.actions[0]?.value; // Format: "reviewId:index"
        const messageTs = actionBody.message?.ts || actionBody.container?.message_ts;
        const channelId = actionBody.channel?.id;
        
        if (!value || !value.includes(':')) {
          logger.error('Invalid approve_issue value:', value);
          await respond({ text: '❌ Invalid request.' });
          return;
        }
        
        const [reviewId, indexStr] = value.split(':');
        const index = parseInt(indexStr, 10);
        
        if (isNaN(index)) {
          logger.error('Invalid issue index:', indexStr);
          await respond({ text: '❌ Invalid issue index.' });
          return;
        }
        
        logger.info(`Processing individual issue approval: reviewId=${reviewId}, index=${index}`);
        
        // Get review data
        let reviewData: ReviewRequestData | null = null;
        if (this.useKV) {
          reviewData = await this.getReviewKV(reviewId);
        }
        
        if (!reviewData) {
          await respond({ text: '❌ Review not found or expired.' });
          return;
        }
        
        // Check if already processed
        if (reviewData.approvedIssues?.includes(index) || reviewData.rejectedIssues?.includes(index)) {
          await respond({ text: '✅ This issue has already been processed.' });
          return;
        }
        
        // Create the single issue
        if (this.linearCreator && reviewData.linearIssues[index]) {
          try {
            const issueInput = reviewData.linearIssues[index];
            logger.info(`Creating issue ${index + 1}/${reviewData.linearIssues.length}: ${issueInput.title}`);
            
            const issueId = await this.linearCreator.createIssue(issueInput);
            logger.info(`Created issue ${index + 1}: ${issueId}`);
            
            // Update approval state
            if (!reviewData.approvedIssues) reviewData.approvedIssues = [];
            reviewData.approvedIssues.push(index);
            
            // Save updated state
            if (this.useKV) {
              await this.storeReviewKV(reviewId, reviewData);
            }
            
            // Update message
            if (messageTs && channelId) {
              const updatedBlocks = this.createReviewBlocks(
                reviewData.actionItems,
                reviewData.linearIssues,
                reviewId,
                reviewData.approvedIssues || [],
                reviewData.rejectedIssues || []
              );
              
              await this.app.client.chat.update({
                channel: channelId,
                ts: messageTs,
                text: `✅ Approved issue ${index + 1}/${reviewData.linearIssues.length}`,
                blocks: updatedBlocks,
              });
            }
            
            await respond({ 
              text: `✅ Approved and created issue ${index + 1}: ${issueInput.title}`,
              replace_original: false 
            });
          } catch (error) {
            logger.error(`Failed to create issue ${index + 1}:`, error);
            await respond({ text: `❌ Failed to create issue. Please check logs.` });
          }
        } else {
          await respond({ text: '❌ Issue not found or Linear creator not configured.' });
        }
      } catch (error) {
        logger.error('Error handling individual approval:', error);
        await respond({ text: '❌ Error processing approval. Please try again.' });
      }
    });

    // Handler for individual issue rejection
    this.app.action('reject_issue', async ({ ack, body, respond }) => {
      await ack();
      
      try {
        const actionBody = body as any;
        const value = actionBody.actions[0]?.value; // Format: "reviewId:index"
        const messageTs = actionBody.message?.ts || actionBody.container?.message_ts;
        const channelId = actionBody.channel?.id;
        
        if (!value || !value.includes(':')) {
          logger.error('Invalid reject_issue value:', value);
          await respond({ text: '❌ Invalid request.' });
          return;
        }
        
        const [reviewId, indexStr] = value.split(':');
        const index = parseInt(indexStr, 10);
        
        if (isNaN(index)) {
          logger.error('Invalid issue index:', indexStr);
          await respond({ text: '❌ Invalid issue index.' });
          return;
        }
        
        logger.info(`Processing individual issue rejection: reviewId=${reviewId}, index=${index}`);
        
        // Get review data
        let reviewData: ReviewRequestData | null = null;
        if (this.useKV) {
          reviewData = await this.getReviewKV(reviewId);
        }
        
        if (!reviewData) {
          await respond({ text: '❌ Review not found or expired.' });
          return;
        }
        
        // Check if already processed
        if (reviewData.approvedIssues?.includes(index) || reviewData.rejectedIssues?.includes(index)) {
          await respond({ text: '✅ This issue has already been processed.' });
          return;
        }
        
        // Update rejection state
        if (!reviewData.rejectedIssues) reviewData.rejectedIssues = [];
        reviewData.rejectedIssues.push(index);
        
        // Save updated state
        if (this.useKV) {
          await this.storeReviewKV(reviewId, reviewData);
        }
        
        // Update message
        if (messageTs && channelId) {
          const updatedBlocks = this.createReviewBlocks(
            reviewData.actionItems,
            reviewData.linearIssues,
            reviewId,
            reviewData.approvedIssues || [],
            reviewData.rejectedIssues || []
          );
          
          await this.app.client.chat.update({
            channel: channelId,
            ts: messageTs,
            text: `❌ Rejected issue ${index + 1}/${reviewData.linearIssues.length}`,
            blocks: updatedBlocks,
          });
        }
        
        await respond({ 
          text: `❌ Rejected issue ${index + 1}: ${reviewData.linearIssues[index]?.title}`,
          replace_original: false 
        });
      } catch (error) {
        logger.error('Error handling individual rejection:', error);
        await respond({ text: '❌ Error processing rejection. Please try again.' });
      }
    });
  }

  /**
   * Post a recap message to Slack (informational only, no approval needed)
   * @param recapText - The formatted recap text from RecapGenerator
   */
  async postRecapMessage(recapText: string): Promise<void> {
    try {
      const blocks = this.createRecapBlocks(recapText);

      await this.app.client.chat.postMessage({
        channel: this.channelId,
        text: '📋 Meeting Recap',
        blocks,
      });

      logger.info('Recap message posted to Slack');
    } catch (error) {
      logger.error('Failed to post recap message to Slack:', error);
      throw error;
    }
  }

  /**
   * Convert recap text into Slack blocks
   * Handles emoji headers and bullet points
   */
  private createRecapBlocks(recapText: string): KnownBlock[] {
    const blocks: KnownBlock[] = [];
    
    // Split by lines
    const lines = recapText.split('\n').filter(line => line.trim());
    
    let currentSection: string[] = [];
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Check if this is a header (starts with emoji, e.g., ":emoji: Title")
      if (trimmed.match(/^:[\w-]+:\s+.+/) || trimmed.match(/^\*[\w\s]+\*/)) {
        // If we have accumulated content, add it as a section
        if (currentSection.length > 0) {
          blocks.push({
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: currentSection.join('\n'),
            },
          });
          currentSection = [];
        }
        
        // Add divider before new section
        if (blocks.length > 0) {
          blocks.push({ type: 'divider' });
        }
        
        // Add header as a section
        blocks.push({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: trimmed,
          },
        });
      } else if (trimmed.startsWith('@') || trimmed.startsWith('-') || trimmed.startsWith('•')) {
        // It's a bullet point or action item
        currentSection.push(trimmed);
      } else if (trimmed.length > 0) {
        // Regular text
        currentSection.push(trimmed);
      }
    }
    
    // Add remaining content
    if (currentSection.length > 0) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: currentSection.join('\n'),
        },
      });
    }
    
    // If no blocks were created, just post the raw text
    if (blocks.length === 0) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: recapText,
        },
      });
    }
    
    return blocks;
  }

  async requestReview(
    actionItems: ActionItem[],
    linearIssues: LinearIssueInput[],
    callback?: (approved: boolean) => Promise<void> // Optional, not used with KV
  ): Promise<string> {
    const reviewId = `review_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const blocks = this.createReviewBlocks(actionItems, linearIssues, reviewId, [], []);

    try {
      const result = await this.app.client.chat.postMessage({
        channel: this.channelId,
        text: `📋 Review ${actionItems.length} Action Item(s) for Linear`,
        blocks,
      });

      // Store review request data (without callback - callbacks can't be serialized)
      const reviewData: ReviewRequestData = {
        actionItems,
        linearIssues,
        timestamp: Date.now(),
        messageTs: result.ts || undefined,
        channelId: this.channelId,
        approvedIssues: [],
        rejectedIssues: [],
      };

      if (this.useKV) {
        try {
          await this.storeReviewKV(reviewId, reviewData);
          logger.info(`Review ${reviewId} stored in KV successfully`);
          
          // Verify storage (quick check to ensure it was stored)
          const verifyData = await this.getReviewKV(reviewId);
          if (!verifyData) {
            logger.error(`CRITICAL: Review ${reviewId} was not stored in KV even though storeReviewKV succeeded!`);
          } else {
            logger.info(`Verified: Review ${reviewId} is retrievable from KV`);
          }
        } catch (error) {
          logger.error(`Failed to store review ${reviewId} in KV:`, error);
          // Continue anyway - the message is posted, but buttons won't work
          logger.warn(`Review message posted but KV storage failed - buttons will not work for reviewId: ${reviewId}`);
        }
      } else {
        // For local development, warn if KV is not enabled
        logger.warn('KV not enabled - review state will not persist. Enable KV for production.');
      }

      logger.info(`Posted review ${reviewId} to Slack`);
      return reviewId;
    } catch (error) {
      logger.error('Failed to post review to Slack:', error);
      throw error;
    }
  }

  private createReviewBlocks(
    actionItems: ActionItem[],
    linearIssues: LinearIssueInput[],
    reviewId: string,
    approvedIssues: number[] = [],
    rejectedIssues: number[] = []
  ): KnownBlock[] {
    const blocks: KnownBlock[] = [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*📋 Review Action Items for Linear*\n\nFound *${actionItems.length}* action item(s) from the meeting transcript. Review and approve each one individually.`,
        },
      },
      {
        type: 'divider',
      },
    ];

    // Add each action item with its own approve/reject buttons
    linearIssues.forEach((issue, index) => {
      const isApproved = approvedIssues.includes(index);
      const isRejected = rejectedIssues.includes(index);
      const status = isApproved ? '✅ Approved' : isRejected ? '❌ Rejected' : '';
      
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*${index + 1}. ${issue.title}* ${status}\n${this.truncateDescription(issue.description)}\n\n*Priority:* ${this.getPriorityLabel(issue.priority)}${issue.assigneeId ? `\n*Assignee:* ${issue.assigneeId}` : ''}`,
        },
      });
      
      // Add action buttons only if not already approved/rejected
      if (!isApproved && !isRejected) {
        blocks.push({
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: '✅ Approve',
              },
              style: 'primary',
              action_id: 'approve_issue',
              value: `${reviewId}:${index}`,
            },
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: '❌ Reject',
              },
              style: 'danger',
              action_id: 'reject_issue',
              value: `${reviewId}:${index}`,
            },
          ],
        });
      }
    });

    return blocks;
  }

  private createProcessingBlocks(message: string): KnownBlock[] {
    return [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: message,
        },
      },
    ];
  }

  private createApprovedBlocks(review: ReviewRequestData, issueCount?: number): KnownBlock[] {
    const count = issueCount || review.linearIssues.length;
    return [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `✅ *Approved*\n\nCreated ${count} issue(s) in Linear.`,
        },
      },
    ];
  }

  private createErrorBlocks(errorMessage: string): KnownBlock[] {
    return [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `❌ *Error*\n\n${errorMessage}`,
        },
      },
    ];
  }

  private createRejectedBlocks(review: ReviewRequestData): KnownBlock[] {
    return [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `❌ *Rejected*\n\nIssue creation cancelled.`,
        },
      },
    ];
  }

  private createExpiredBlocks(review: ReviewRequestData): KnownBlock[] {
    return [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `⏰ *Expired*\n\nReview timeout reached. Issues were not created.`,
        },
      },
    ];
  }

  private getPriorityLabel(priority?: number): string {
    const labels: Record<number, string> = {
      1: '🔴 High',
      2: '🟡 Medium',
      3: '🟢 Low',
      4: '⚪ No Priority',
    };
    return labels[priority || 4] || '⚪ No Priority';
  }

  private truncateDescription(description: string, maxLength: number = 200): string {
    if (description.length <= maxLength) {
      return description;
    }
    return description.substring(0, maxLength) + '...';
  }

  async stop(): Promise<void> {
    await this.app.stop();
    logger.info('Slack app stopped');
  }
}
