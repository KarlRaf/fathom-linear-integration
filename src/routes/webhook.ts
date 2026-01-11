import { Router, Request, Response } from 'express';
import { verifyWebhookSignature } from '../services/fathom/webhook-verifier';
import { GitHubLogger } from '../services/github/logger';
import { ActionItemExtractor } from '../services/ai/action-extractor';
import { RecapGenerator } from '../services/ai/recap-generator';
import { LinearTransformer } from '../services/linear/transformer';
import { LinearIssueCreator } from '../services/linear/client';
import { SlackReviewer } from '../services/slack/reviewer';
import { reviewStorage } from '../services/review/review-storage';
import { FathomWebhookPayload } from '../types/fathom';
import { logger } from '../utils/logger';
import { config } from '../config/env';
import { extractPrimaryDomain } from '../utils/domain-extractor';

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

      // Store review in KV for webapp-based approval
      try {
        // Generate review ID
        const reviewId = `review_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Extract primary domain from calendar invitees
        const domain = extractPrimaryDomain(payload.calendar_invitees) || undefined;
        
        // Store review in KV
        await reviewStorage.storeReview({
          reviewId,
          actionItems,
          linearIssues,
          recordingId: payload.recording.id,
          meetingTitle: payload.recording.title || 'Meeting',
          summary: payload.summary,
          timestamp: Date.now(),
          createdAt: new Date().toISOString(),
          status: 'pending',
          domain,
          approvedIssueIndices: [],
          rejectedIssueIndices: [],
        });
        
        logger.info(`Review ${reviewId} stored in KV for webapp approval`);
        
        // Determine review URL (use VERCEL_URL if available, otherwise default)
        const baseUrl = process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}`
          : process.env.VERCEL
            ? 'https://fathom-linear-integration.vercel.app'
            : 'http://localhost:3000';
        
        return res.json({
          message: 'Review created - pending approval in webapp',
          reviewId,
          reviewUrl: `${baseUrl}/reviews/${reviewId}`,
          actionItemsCount: actionItems.length,
          reviewRequired: true,
          recordingId: payload.recording.id,
        });
      } catch (error) {
        logger.error('Failed to store review:', error);
        return res.status(500).json({ error: 'Failed to store review for approval' });
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

