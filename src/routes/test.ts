import { Router, Request, Response } from 'express';
import { logger } from '../utils/logger';
import { GitHubLogger } from '../services/github/logger';
import { ActionItemExtractor } from '../services/ai/action-extractor';
import { LinearTransformer } from '../services/linear/transformer';
import { LinearIssueCreator } from '../services/linear/client';
import { SlackReviewer } from '../services/slack/reviewer';
import { FathomWebhookPayload } from '../types/fathom';
import { config } from '../config/env';

export function createTestRouter(services: {
  githubLogger: GitHubLogger;
  actionExtractor: ActionItemExtractor;
  linearTransformer: LinearTransformer;
  linearCreator: LinearIssueCreator;
  slackReviewer: SlackReviewer;
}) {
  const router = Router();

  // Helper function to transform mock payload to FathomWebhookPayload format
  function transformMockPayload(mockPayload: any): FathomWebhookPayload {
    const transcriptText = mockPayload.transcript
      ? mockPayload.transcript.map((item: any) => `${item.speaker.display_name}: ${item.text}`).join('\n')
      : '';

    return {
      event: {
        id: `test-${Date.now()}`,
        event_type: 'recording.processed',
        timestamp: new Date().toISOString(),
      },
      recording: {
        id: mockPayload.recording_id?.toString() || 'test-recording',
        title: mockPayload.title || mockPayload.meeting_title || 'Test Recording',
        started_at: mockPayload.recording_start_time || mockPayload.scheduled_start_time || new Date().toISOString(),
        ended_at: mockPayload.recording_end_time || mockPayload.scheduled_end_time || new Date().toISOString(),
        duration_seconds: 0,
      },
      transcript: {
        text: transcriptText,
        paragraphs: mockPayload.transcript?.map((item: any) => ({
          speaker: item.speaker?.display_name || 'Unknown',
          text: item.text || '',
          start_time: parseTimestamp(item.timestamp || '00:00:00'),
          end_time: parseTimestamp(item.timestamp || '00:00:00') + 5,
        })) || [],
      },
      summary: mockPayload.default_summary?.markdown_formatted || '',
      action_items: mockPayload.action_items?.map((item: any) => ({
        text: item.description || '',
        owner: item.assignee?.name || undefined,
      })) || [],
    };
  }

  // Helper function to parse timestamp (HH:MM:SS) to seconds
  function parseTimestamp(timestamp: string): number {
    const parts = timestamp.split(':').map(Number);
    if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
    return 0;
  }

  // Step 1: Test GitHub Logging
  router.post('/test-github', async (req: Request, res: Response) => {
    try {
      logger.info('Testing GitHub logging...');
      const mockPayload = req.body;
      const payload = transformMockPayload(mockPayload);

      await services.githubLogger.logTranscript(payload);

      res.json({
        success: true,
        message: 'Transcript logged to GitHub successfully',
        recordingId: payload.recording.id,
        filename: `call_transcript/${new Date().toISOString().split('T')[0]}/${payload.recording.id}.json`,
      });
    } catch (error) {
      logger.error('GitHub logging test failed:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to log transcript to GitHub',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Step 2: Test Action Items Extraction
  router.post('/test-extract', async (req: Request, res: Response) => {
    try {
      logger.info('Testing action items extraction...');
      const mockPayload = req.body;
      const payload = transformMockPayload(mockPayload);

      const transcript = payload.transcript?.text || '';
      const summary = payload.summary;

      if (!transcript) {
        return res.status(400).json({ error: 'No transcript found in payload' });
      }

      const actionItems = await services.actionExtractor.extract(transcript, summary);

      res.json({
        success: true,
        message: 'Action items extracted successfully',
        actionItemsCount: actionItems.length,
        actionItems: actionItems,
      });
    } catch (error) {
      logger.error('Action items extraction test failed:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to extract action items',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Step 3: Test Slack Review (without creating Linear issues)
  router.post('/test-slack', async (req: Request, res: Response) => {
    try {
      logger.info('Testing Slack review...');
      const mockPayload = req.body;
      const payload = transformMockPayload(mockPayload);

      const transcript = payload.transcript?.text || '';
      const summary = payload.summary;

      if (!transcript) {
        return res.status(400).json({ error: 'No transcript found in payload' });
      }

      // Extract action items
      const actionItems = await services.actionExtractor.extract(transcript, summary);

      if (actionItems.length === 0) {
        return res.json({
          success: true,
          message: 'No action items found',
          actionItems: [],
        });
      }

      // Transform to Linear format
      const linearIssues = await Promise.all(
        actionItems.map((item) => services.linearTransformer.transformActionItem(item))
      );

      // Post to Slack for review (with empty callback for testing)
      const reviewId = await services.slackReviewer.requestReview(
        actionItems,
        linearIssues,
        async (approved: boolean) => {
          logger.info(`Slack review callback called with approved: ${approved} (test mode - no Linear creation)`);
        }
      );

      res.json({
        success: true,
        message: 'Review posted to Slack successfully',
        reviewId: reviewId,
        actionItemsCount: actionItems.length,
        linearIssuesPreview: linearIssues.map(issue => ({
          title: issue.title,
          priority: issue.priority,
          assigneeId: issue.assigneeId,
        })),
      });
    } catch (error) {
      logger.error('Slack review test failed:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to post review to Slack',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Step 4: Test Linear Issue Creation (bypasses Slack)
  router.post('/test-linear', async (req: Request, res: Response) => {
    try {
      logger.info('Testing Linear issue creation...');
      const mockPayload = req.body;
      const payload = transformMockPayload(mockPayload);

      const transcript = payload.transcript?.text || '';
      const summary = payload.summary;

      if (!transcript) {
        return res.status(400).json({ error: 'No transcript found in payload' });
      }

      // Extract action items
      const actionItems = await services.actionExtractor.extract(transcript, summary);

      if (actionItems.length === 0) {
        return res.json({
          success: true,
          message: 'No action items found',
          actionItems: [],
        });
      }

      // Transform to Linear format
      const linearIssues = await Promise.all(
        actionItems.map((item) => services.linearTransformer.transformActionItem(item))
      );

      // Create issues directly (bypassing Slack)
      const issueIds = await services.linearCreator.createIssues(linearIssues);

      res.json({
        success: true,
        message: 'Issues created in Linear successfully',
        issuesCount: issueIds.length,
        issueIds: issueIds,
        issuesPreview: linearIssues.map(issue => ({
          title: issue.title,
          priority: issue.priority,
          assigneeId: issue.assigneeId,
        })),
      });
    } catch (error) {
      logger.error('Linear issue creation test failed:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create issues in Linear',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Full flow test (all steps together)
  router.post('/mock-webhook', async (req: Request, res: Response) => {
    try {
      logger.info('Received mock webhook for testing (full flow)');

      const mockPayload = req.body;
      const payload = transformMockPayload(mockPayload);

      logger.info(`Processing mock transcript for recording: ${payload.recording.id}`);

      // Step 1: Log to GitHub (async, don't wait)
      services.githubLogger.logTranscript(payload).catch((error) => {
        logger.error('GitHub logging failed (non-critical):', error);
      });

      // Step 2: Extract transcript
      const transcript = payload.transcript?.text || '';
      const summary = payload.summary;

      if (!transcript) {
        logger.warn('No transcript found in mock payload');
        return res.status(400).json({ error: 'No transcript found in payload' });
      }

      // Step 3: Extract action items using AI
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

      // Step 4: Transform action items to Linear format
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

      // Step 5: Request Slack review
      try {
        const reviewId = await services.slackReviewer.requestReview(
          actionItems,
          linearIssues,
          async (approved: boolean) => {
            if (approved) {
              try {
                const issueIds = await services.linearCreator.createIssues(linearIssues);
                logger.info(`Created ${issueIds.length} issues in Linear:`, issueIds);
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
        message: 'Mock webhook processed successfully - review pending in Slack',
        actionItemsCount: actionItems.length,
        reviewRequired: true,
        recordingId: payload.recording.id,
      });
    } catch (error) {
      logger.error('Mock webhook processing error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  return router;
}
