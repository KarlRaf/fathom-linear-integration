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
      await kv.set(key, JSON.stringify(data), { ex: Math.floor(this.reviewTimeout / 1000) }); // TTL in seconds
      logger.debug(`Stored review ${reviewId} in KV`);
    } catch (error) {
      logger.error(`Failed to store review ${reviewId} in KV:`, error);
      throw error;
    }
  }

  private async getReviewKV(reviewId: string): Promise<ReviewRequestData | null> {
    if (!this.useKV) return null;
    try {
      const key = this.getKVKey(reviewId);
      const data = await kv.get<string>(key);
      if (!data) return null;
      return JSON.parse(data) as ReviewRequestData;
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
        const reviewId = actionBody.actions[0].value;
        
        // Get review data from KV or memory
        let reviewData: ReviewRequestData | null = null;
        
        if (this.useKV) {
          reviewData = await this.getReviewKV(reviewId);
        } else {
          // Fallback to in-memory storage (for local development)
          // This won't work in serverless, but helps with local testing
          await respond({ text: '❌ In-memory storage not available. Use KV for serverless deployment.' });
          return;
        }

        if (!reviewData) {
          await respond({ text: '❌ Review not found or expired.' });
          return;
        }

        // Create Linear issues
        if (this.linearCreator) {
          try {
            const issueIds = await this.linearCreator.createIssues(reviewData.linearIssues);
            logger.info(`Created ${issueIds.length} issues in Linear:`, issueIds);
            
            await respond({ 
              text: `✅ Approved! Created ${reviewData.linearIssues.length} issue(s) in Linear...`,
              replace_original: false 
            });
            
            // Update the original message
            if (reviewData.messageTs && reviewData.channelId) {
              try {
                await this.app.client.chat.update({
                  channel: reviewData.channelId,
                  ts: reviewData.messageTs,
                  text: `✅ Approved - Issues created in Linear`,
                  blocks: this.createApprovedBlocks(reviewData),
                });
              } catch (error) {
                logger.warn('Failed to update original message:', error);
              }
            }
            
            // Delete from KV
            await this.deleteReviewKV(reviewId);
            logger.info(`Review ${reviewId} approved and issues created`);
          } catch (error) {
            logger.error('Failed to create Linear issues:', error);
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
        const reviewId = actionBody.actions[0].value;
        
        // Get review data from KV
        let reviewData: ReviewRequestData | null = null;
        
        if (this.useKV) {
          reviewData = await this.getReviewKV(reviewId);
        }

        if (!reviewData) {
          await respond({ text: '❌ Review not found or expired.' });
          return;
        }

        // Update the original message
        if (reviewData.messageTs && reviewData.channelId) {
          try {
            await this.app.client.chat.update({
              channel: reviewData.channelId,
              ts: reviewData.messageTs,
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

    const blocks = this.createReviewBlocks(actionItems, linearIssues, reviewId);

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
      };

      if (this.useKV) {
        await this.storeReviewKV(reviewId, reviewData);
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
    reviewId: string
  ): KnownBlock[] {
    const blocks: KnownBlock[] = [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*📋 Review Action Items for Linear*\n\nFound *${actionItems.length}* action item(s) from the meeting transcript.`,
        },
      },
      {
        type: 'divider',
      },
    ];

    // Add each action item
    linearIssues.forEach((issue, index) => {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*${index + 1}. ${issue.title}*\n${this.truncateDescription(issue.description)}\n\n*Priority:* ${this.getPriorityLabel(issue.priority)}${issue.assigneeId ? `\n*Assignee:* ${issue.assigneeId}` : ''}`,
        },
      });
    });

    blocks.push(
      {
        type: 'divider',
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: '✅ Approve & Create',
            },
            style: 'primary',
            action_id: 'approve_issues',
            value: reviewId,
          },
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: '❌ Reject',
            },
            style: 'danger',
            action_id: 'reject_issues',
            value: reviewId,
          },
        ],
      }
    );

    return blocks;
  }

  private createApprovedBlocks(review: ReviewRequestData): KnownBlock[] {
    return [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `✅ *Approved*\n\nCreated ${review.linearIssues.length} issue(s) in Linear.`,
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
