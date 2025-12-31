import { App, ExpressReceiver } from '@slack/bolt';
import { Block, KnownBlock } from '@slack/types';
import { logger } from '../../utils/logger';
import { ActionItem } from '../../types/action-item';
import { LinearIssueInput } from '../../types/linear';

interface ReviewRequest {
  actionItems: ActionItem[];
  linearIssues: LinearIssueInput[];
  callback: (approved: boolean) => Promise<void>;
  timestamp: number;
}

export class SlackReviewer {
  private app: App;
  private receiver: ExpressReceiver;
  private channelId: string;
  private pendingReviews: Map<string, ReviewRequest> = new Map();
  private reviewTimeout: number = 30 * 60 * 1000; // 30 minutes default

  constructor(botToken: string, signingSecret: string, channelId: string) {
    this.receiver = new ExpressReceiver({
      signingSecret,
    });
    
    this.app = new App({
      token: botToken,
      receiver: this.receiver,
    });
    
    this.channelId = channelId;
    this.setupHandlers();
  }

  // Get the Express router for mounting in the main server
  getRouter() {
    return this.receiver.router;
  }

  private setupHandlers() {
    this.app.action('approve_issues', async ({ ack, body, respond }) => {
      await ack();
      
      try {
        const actionBody = body as any;
        const reviewId = actionBody.actions[0].value;
        const review = this.pendingReviews.get(reviewId);

        if (review) {
          await review.callback(true);
          await respond({ 
            text: `✅ Approved! Creating ${review.linearIssues.length} issue(s) in Linear...`,
            replace_original: false 
          });
          
          // Update the original message
          try {
            await this.app.client.chat.update({
              channel: actionBody.channel.id,
              ts: actionBody.message.ts,
              text: `✅ Approved - Issues created in Linear`,
              blocks: this.createApprovedBlocks(review),
            });
          } catch (error) {
            logger.warn('Failed to update original message:', error);
          }
          
          this.pendingReviews.delete(reviewId);
          logger.info(`Review ${reviewId} approved`);
        } else {
          await respond({ text: '❌ Review not found or expired.' });
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
        const review = this.pendingReviews.get(reviewId);

        if (review) {
          await review.callback(false);
          
          try {
            await this.app.client.chat.update({
              channel: actionBody.channel.id,
              ts: actionBody.message.ts,
              text: `❌ Rejected - Issues not created`,
              blocks: this.createRejectedBlocks(review),
            });
          } catch (error) {
            logger.warn('Failed to update original message:', error);
          }
          
          await respond({ text: '❌ Issue creation cancelled.' });
          this.pendingReviews.delete(reviewId);
          logger.info(`Review ${reviewId} rejected`);
        } else {
          await respond({ text: '❌ Review not found or expired.' });
        }
      } catch (error) {
        logger.error('Error handling rejection:', error);
        await respond({ text: '❌ Error processing rejection. Please try again.' });
      }
    });
  }

  async requestReview(
    actionItems: ActionItem[],
    linearIssues: LinearIssueInput[],
    callback: (approved: boolean) => Promise<void>
  ): Promise<string> {
    const reviewId = `review_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const blocks = this.createReviewBlocks(actionItems, linearIssues, reviewId);

    try {
      const result = await this.app.client.chat.postMessage({
        channel: this.channelId,
        text: `📋 Review ${actionItems.length} Action Item(s) for Linear`,
        blocks,
      });

      // Store review request
      this.pendingReviews.set(reviewId, {
        actionItems,
        linearIssues,
        callback,
        timestamp: Date.now(),
      });

      // Set timeout to auto-reject after timeout period
      setTimeout(() => {
        const review = this.pendingReviews.get(reviewId);
        if (review) {
          logger.info(`Review ${reviewId} expired after timeout`);
          this.pendingReviews.delete(reviewId);
          // Optionally update the message to show it expired
          this.app.client.chat.update({
            channel: this.channelId,
            ts: result.ts!,
            text: `⏰ Review expired - Issues not created`,
            blocks: this.createExpiredBlocks(review),
          }).catch((error) => {
            logger.warn('Failed to update expired review message:', error);
          });
        }
      }, this.reviewTimeout);

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

  private createApprovedBlocks(review: ReviewRequest): KnownBlock[] {
    return [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `✅ *Approved*\n\nCreating ${review.linearIssues.length} issue(s) in Linear...`,
        },
      },
    ];
  }

  private createRejectedBlocks(review: ReviewRequest): KnownBlock[] {
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

  private createExpiredBlocks(review: ReviewRequest): KnownBlock[] {
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

