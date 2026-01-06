import { Router, Request, Response } from 'express';
import { verifyWebhookSignature } from '../services/fathom/webhook-verifier';
import { GitHubLogger } from '../services/github/logger';
import { ActionItemExtractor } from '../services/ai/action-extractor';
import { RecapGenerator } from '../services/ai/recap-generator';
import { LinearTransformer } from '../services/linear/transformer';
import { LinearIssueCreator } from '../services/linear/client';
import { SlackReviewer } from '../services/slack/reviewer';
import { FathomWebhookPayload } from '../types/fathom';
import { logger } from '../utils/logger';
import { config } from '../config/env';

export function createWebhookRouter(services: {
  githubLogger: GitHubLogger;
  actionExtractor: ActionItemExtractor;
  recapGenerator: RecapGenerator;
  linearTransformer: LinearTransformer;
  linearCreator: LinearIssueCreator;
  slackReviewer?: SlackReviewer;
}) {
  const router = Router();

  router.post('/fathom', async (req: Request, res: Response) => {
    try {
      // Get raw body for signature verification
      // In Vercel serverless, the raw body might be in req.rawBody or we need to reconstruct it
      let rawBody = (req as any).rawBody;
      
      // If rawBody is not available, try to reconstruct it from the parsed body
      // This is a fallback for Vercel serverless functions
      if (!rawBody && req.body) {
        rawBody = JSON.stringify(req.body);
        logger.debug('Reconstructed rawBody from parsed body', { bodyKeys: Object.keys(req.body) });
      }
      
      if (!rawBody) {
        logger.error('Unable to get raw body for signature verification');
        return res.status(400).json({ error: 'Missing request body' });
      }

      // Check multiple possible header names for signature
      const signature = 
        (req.headers['webhook-signature'] as string) ||
        (req.headers['x-fathom-signature'] as string) ||
        (req.headers['x-webhook-signature'] as string);

      logger.debug('Webhook request received', {
        hasSignature: !!signature,
        signatureHeader: signature ? signature.substring(0, 20) + '...' : 'missing',
        rawBodyLength: rawBody.length,
        contentType: req.headers['content-type'],
        allHeaders: Object.keys(req.headers),
      });

      if (!signature) {
        logger.warn('Missing webhook signature header', {
          availableHeaders: Object.keys(req.headers).filter(h => h.toLowerCase().includes('signature') || h.toLowerCase().includes('webhook')),
        });
        return res.status(401).json({ error: 'Missing webhook signature' });
      }

      // Verify webhook signature
      if (!verifyWebhookSignature(config.fathom.webhookSecret, signature, rawBody)) {
        logger.warn('Invalid webhook signature', {
          secretLength: config.fathom.webhookSecret?.length || 0,
          signatureLength: signature.length,
        });
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

      // Post Slack recap and request Linear approval (if Slack is configured)
      if (services.slackReviewer) {
        try {
          // Step 1: Post recap message (async, fire and forget - don't wait)
          // This is non-critical and can happen in the background
          services.recapGenerator.generateRecap(payload)
            .then((recapText) => services.slackReviewer!.postRecapMessage(recapText))
            .then(() => logger.info('Recap message posted to Slack'))
            .catch((error) => {
              logger.error('Failed to post recap message (non-critical):', error);
            });

          // Step 2: Request approval for Linear issues (we need to wait for this)
          const reviewId = await services.slackReviewer.requestReview(
            actionItems,
            linearIssues
          );

          logger.info(`Review ${reviewId} posted to Slack`);
          
          return res.json({
            message: 'Processing started - recap posting, review pending in Slack',
            actionItemsCount: actionItems.length,
            reviewRequired: true,
            recordingId: payload.recording.id,
          });
        } catch (error) {
          logger.error('Failed to post review to Slack:', error);
          return res.status(500).json({ error: 'Failed to post review to Slack' });
        }
      } else {
        // Slack not configured - create issues directly
        try {
          const issueIds = await services.linearCreator.createIssues(linearIssues);
          logger.info(`Created ${issueIds.length} issues in Linear:`, issueIds);
          
          return res.json({
            message: 'Processing complete - issues created in Linear',
            actionItemsCount: actionItems.length,
            issuesCreated: issueIds.length,
            reviewRequired: false,
            recordingId: payload.recording.id,
          });
        } catch (error) {
          logger.error('Failed to create Linear issues:', error);
          return res.status(500).json({ error: 'Failed to create Linear issues' });
        }
      }
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

