import express, { Request, Response } from 'express';
import { config } from './config/env';
import { logger } from './utils/logger';
import { createWebhookRouter } from './routes/webhook';
import { createTestRouter } from './routes/test';
import { GitHubLogger } from './services/github/logger';
import { ActionItemExtractor } from './services/ai/action-extractor';
import { RecapGenerator } from './services/ai/recap-generator';
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
const recapGenerator = new RecapGenerator(config.openai.apiKey);

const linearTransformer = new LinearTransformer(
  config.linear.apiKey,
  config.linear.teamId,
  config.linear.projectId,
  config.linear.stateId
);

const linearCreator = new LinearIssueCreator(config.linear.apiKey);

// Initialize Slack reviewer only if credentials are provided
// Make it optional to allow server to start without Slack configured
let slackReviewer: SlackReviewer | undefined;
try {
  if (config.slack.botToken && config.slack.signingSecret && config.slack.channelId) {
    logger.info('Slack credentials found, initializing SlackReviewer...');
    // Use KV if KV environment variables are set (supports both Vercel KV and Upstash Redis)
    // @vercel/kv automatically detects both naming conventions, but we check for either
    const hasKV = !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
    const hasUpstash = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
    const useKV = hasKV || hasUpstash;
    logger.info(`Using KV for state storage: ${useKV} (KV vars: ${hasKV}, Upstash vars: ${hasUpstash})`);
    slackReviewer = new SlackReviewer(
      config.slack.botToken,
      config.slack.signingSecret,
      config.slack.channelId,
      useKV
    );
    // Set Linear creator for callback execution (required for KV mode)
    slackReviewer.setLinearCreator(linearCreator);
    logger.info('Slack reviewer initialized successfully');
  } else {
    logger.warn('Slack credentials not provided - Slack review feature will be disabled');
    logger.debug(`Bot token: ${config.slack.botToken ? 'set' : 'missing'}, Signing secret: ${config.slack.signingSecret ? 'set' : 'missing'}, Channel ID: ${config.slack.channelId ? 'set' : 'missing'}`);
  }
} catch (error) {
  logger.error('Failed to initialize Slack reviewer - Slack review feature will be disabled:', error);
  logger.error('Error details:', error instanceof Error ? error.stack : String(error));
  slackReviewer = undefined;
}

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
  recapGenerator,
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
    recapGenerator,
    linearTransformer,
    linearCreator,
    slackReviewer,
  });
  app.use('/test', testRouter);
  logger.info('Test endpoint available at: /test/mock-webhook');
}

// Mount Slack Bolt receiver on the same Express server (only if Slack is configured)
if (slackReviewer) {
  const slackRouter = slackReviewer.getRouter();
  logger.info('Mounting Slack router at /slack/events');
  // ExpressReceiver router should be mounted at the path where Slack sends events
  app.use('/slack/events', slackRouter);
  logger.info('Slack router mounted successfully');
  
  // Debug: Log the router to see what routes it has
  logger.debug('Slack router stack:', (slackRouter as any).stack?.length || 'unknown');
}

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
    if (slackReviewer) {
      slackReviewer.stop().then(() => {
        process.exit(0);
      });
    } else {
      process.exit(0);
    }
  });

  process.on('SIGINT', () => {
    logger.info('SIGINT received, shutting down gracefully');
    if (slackReviewer) {
      slackReviewer.stop().then(() => {
        process.exit(0);
      });
    } else {
      process.exit(0);
    }
  });
}

