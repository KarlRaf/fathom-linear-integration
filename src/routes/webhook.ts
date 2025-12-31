import { Router, Request, Response } from 'express';
import { verifyWebhookSignature } from '../services/fathom/webhook-verifier';
import { GitHubLogger } from '../services/github/logger';
import { ActionItemExtractor } from '../services/ai/action-extractor';
import { LinearTransformer } from '../services/linear/transformer';
import { LinearIssueCreator } from '../services/linear/client';
import { SlackReviewer } from '../services/slack/reviewer';
import { FathomWebhookPayload } from '../types/fathom';
import { logger } from '../utils/logger';
import { config } from '../config/env';

export function createWebhookRouter(services: {
  githubLogger: GitHubLogger;
  actionExtractor: ActionItemExtractor;
  linearTransformer: LinearTransformer;
  linearCreator: LinearIssueCreator;
  slackReviewer: SlackReviewer;
}) {
  const router = Router();

  router.post('/fathom', async (req: Request, res: Response) => {
    try {
      // Get raw body for signature verification
      // The raw body should be stored in req.rawBody by middleware
      const rawBody = (req as any).rawBody || JSON.stringify(req.body);
      const signature = req.headers['webhook-signature'] as string;

      if (!signature) {
        logger.warn('Missing webhook signature header');
        return res.status(401).json({ error: 'Missing webhook signature' });
      }

      // Verify webhook signature
      if (!verifyWebhookSignature(config.fathom.webhookSecret, signature, rawBody)) {
        logger.warn('Invalid webhook signature');
        return res.status(401).json({ error: 'Invalid signature' });
      }

      const payload: FathomWebhookPayload = req.body;
      logger.info(`Received Fathom webhook for recording: ${payload.recording.id}`);

      // Log to GitHub (async, don't wait - fire and forget)
      services.githubLogger.logTranscript(payload).catch((error) => {
        logger.error('GitHub logging failed (non-critical):', error);
      });

      // Extract transcript
      const transcript = payload.transcript?.text || '';
      const summary = payload.summary;

      if (!transcript) {
        logger.warn('No transcript found in webhook payload');
        return res.status(400).json({ error: 'No transcript found in webhook' });
      }

      // Extract action items using AI
      let actionItems;
      try {
        actionItems = await services.actionExtractor.extract(transcript, summary);
        logger.info(`Extracted ${actionItems.length} action items`);
      } catch (error) {
        logger.error('Failed to extract action items:', error);
        return res.status(500).json({ error: 'Failed to extract action items' });
      }

      if (actionItems.length === 0) {
        logger.info('No action items found in transcript');
        return res.json({
          message: 'No action items found',
          actionItems: [],
          recordingId: payload.recording.id,
        });
      }

      // Transform action items to Linear format
      let linearIssues;
      try {
        linearIssues = await Promise.all(
          actionItems.map((item) => services.linearTransformer.transformActionItem(item))
        );
        logger.info(`Transformed ${linearIssues.length} action items to Linear format`);
      } catch (error) {
        logger.error('Failed to transform action items:', error);
        return res.status(500).json({ error: 'Failed to transform action items' });
      }

      // Request Slack review
      try {
        const reviewId = await services.slackReviewer.requestReview(
          actionItems,
          linearIssues,
          async (approved: boolean) => {
            if (approved) {
              try {
                const issueIds = await services.linearCreator.createIssues(linearIssues);
                logger.info(`Created ${issueIds.length} issues in Linear:`, issueIds);
                
                // Optionally post success message to Slack
                // This could be enhanced to post individual issue links
              } catch (error) {
                logger.error('Failed to create Linear issues after approval:', error);
                throw error;
              }
            } else {
              logger.info('Issue creation rejected by reviewer');
            }
          }
        );

        logger.info(`Review ${reviewId} posted to Slack`);
      } catch (error) {
        logger.error('Failed to post review to Slack:', error);
        return res.status(500).json({ error: 'Failed to post review to Slack' });
      }

      res.json({
        message: 'Processing started - review pending in Slack',
        actionItemsCount: actionItems.length,
        reviewRequired: true,
        recordingId: payload.recording.id,
      });
    } catch (error) {
      logger.error('Webhook processing error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  return router;
}

