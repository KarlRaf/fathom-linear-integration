import express, { Request, Response } from 'express';
import { config } from './config/env';
import { logger } from './utils/logger';
import { createWebhookRouter } from './routes/webhook';
import { createTestRouter } from './routes/test';
import { GitHubLogger } from './services/github/logger';
import { ActionItemExtractor } from './services/ai/action-extractor';
import { LinearTransformer } from './services/linear/transformer';
import { LinearIssueCreator } from './services/linear/client';
import { SlackReviewer } from './services/slack/reviewer';

// Initialize services
const githubLogger = new GitHubLogger(
  config.github.token,
  config.github.repoOwner,
  config.github.repoName
);

const actionExtractor = new ActionItemExtractor(config.openai.apiKey);

const linearTransformer = new LinearTransformer(
  config.linear.apiKey,
  config.linear.teamId,
  config.linear.projectId
);

const linearCreator = new LinearIssueCreator(config.linear.apiKey);

// Use KV if KV environment variables are set (Vercel deployment)
const useKV = !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
const slackReviewer = new SlackReviewer(
  config.slack.botToken,
  config.slack.signingSecret,
  config.slack.channelId,
  useKV
);
// Set Linear creator for callback execution (required for KV mode)
slackReviewer.setLinearCreator(linearCreator);

// Create Express app
const app = express();

// Middleware: Parse JSON with raw body preservation for webhook verification
app.use(
  express.json({
    verify: (req: any, res, buf) => {
      // Store raw body for webhook signature verification
      req.rawBody = buf.toString('utf8');
    },
  })
);

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Webhook routes
const webhookRouter = createWebhookRouter({
  githubLogger,
  actionExtractor,
  linearTransformer,
  linearCreator,
  slackReviewer,
});

app.use('/webhook', webhookRouter);

// Test route for mock webhook (only in development)
if (config.nodeEnv === 'development') {
  const testRouter = createTestRouter({
    githubLogger,
    actionExtractor,
    linearTransformer,
    linearCreator,
    slackReviewer,
  });
  app.use('/test', testRouter);
  logger.info('Test endpoint available at: /test/mock-webhook');
}

// Mount Slack Bolt receiver on the same Express server
app.use('/slack/events', slackReviewer.getRouter());

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: any) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: config.nodeEnv === 'development' ? err.message : undefined,
  });
});

// Export app for Vercel/serverless
export default app;

// Only start server if not in serverless environment (Vercel sets VERCEL env var)
if (!process.env.VERCEL) {
  const port = config.port;

  // Start Express server
  app.listen(port, async () => {
    logger.info(`Express server started on port ${port}`);
    logger.info(`Fathom webhook endpoint: http://localhost:${port}/webhook/fathom`);
    logger.info(`Slack events endpoint: http://localhost:${port}/slack/events`);
    logger.info(`Health check: http://localhost:${port}/health`);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down gracefully');
    slackReviewer.stop().then(() => {
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    logger.info('SIGINT received, shutting down gracefully');
    slackReviewer.stop().then(() => {
      process.exit(0);
    });
  });
}

