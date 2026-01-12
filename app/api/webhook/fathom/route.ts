import { NextRequest, NextResponse } from 'next/server';
import { verifyWebhookSignature } from '../../../../src/services/fathom/webhook-verifier';
import { GitHubLogger } from '../../../../src/services/github/logger';
import { ActionItemExtractor } from '../../../../src/services/ai/action-extractor';
import { LinearTransformer } from '../../../../src/services/linear/transformer';
import { reviewStorage } from '../../../../src/services/review/review-storage';
import { FathomWebhookPayload } from '../../../../src/types/fathom';
import { logger } from '../../../../src/utils/logger';
import { config } from '../../../../src/config/env';
import { extractPrimaryDomain } from '../../../../src/utils/domain-extractor';
import { getLinearConfig } from '../../../../src/utils/linear-config';

// Mark route as dynamic
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Next.js doesn't parse body by default for POST, we need to handle it
export async function POST(request: NextRequest) {
  try {
    // Get raw body for signature verification
    // In Next.js, we need to read the body as text first
    const rawBody = await request.text();
    
    if (!rawBody) {
      logger.error('Missing request body');
      return NextResponse.json(
        { error: 'Missing request body' },
        { status: 400 }
      );
    }

    // Parse the body for use
    let payload: FathomWebhookPayload;
    try {
      payload = JSON.parse(rawBody);
    } catch (error) {
      logger.error('Invalid JSON in request body:', error);
      return NextResponse.json(
        { error: 'Invalid JSON' },
        { status: 400 }
      );
    }

    // Check multiple possible header names for signature
    const signature = 
      request.headers.get('webhook-signature') ||
      request.headers.get('x-fathom-signature') ||
      request.headers.get('x-webhook-signature');

    logger.debug('Webhook request received', {
      hasSignature: !!signature,
      signatureHeader: signature ? signature.substring(0, 20) + '...' : 'missing',
      rawBodyLength: rawBody.length,
      contentType: request.headers.get('content-type'),
    });

    if (!signature) {
      logger.warn('Missing webhook signature header');
      return NextResponse.json(
        { error: 'Missing webhook signature' },
        { status: 401 }
      );
    }

    // Verify webhook signature
    if (!verifyWebhookSignature(config.fathom.webhookSecret, signature, rawBody)) {
      logger.warn('Invalid webhook signature', {
        secretLength: config.fathom.webhookSecret?.length || 0,
        signatureLength: signature.length,
      });
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    logger.info(`Received Fathom webhook for recording: ${payload.recording.id}`);

    // Initialize services (get latest config dynamically)
    const linearConfig = await getLinearConfig();
    const actionExtractor = new ActionItemExtractor(config.openai.apiKey);
    const linearTransformer = new LinearTransformer(
      linearConfig.apiKey,
      linearConfig.teamId,
      linearConfig.projectId,
      linearConfig.stateId
    );

    // Log to GitHub (async, don't wait - fire and forget)
    if (config.github.token && config.github.repoOwner && config.github.repoName) {
      const githubLogger = new GitHubLogger(
        config.github.token,
        config.github.repoOwner,
        config.github.repoName
      );
      githubLogger.logTranscript(payload).catch((error) => {
        logger.error('GitHub logging failed (non-critical):', error);
      });
    }

    // Extract transcript
    const transcript = payload.transcript?.text || '';
    const summary = payload.summary;

    if (!transcript) {
      logger.warn('No transcript found in webhook payload');
      return NextResponse.json(
        { error: 'No transcript found in webhook' },
        { status: 400 }
      );
    }

    // Extract action items using AI
    let actionItems;
    try {
      actionItems = await actionExtractor.extract(transcript, summary);
      logger.info(`Extracted ${actionItems.length} action items`);
    } catch (error) {
      logger.error('Failed to extract action items:', error);
      return NextResponse.json(
        { error: 'Failed to extract action items' },
        { status: 500 }
      );
    }

    if (actionItems.length === 0) {
      logger.info('No action items found in transcript');
      return NextResponse.json({
        message: 'No action items found',
        actionItems: [],
        recordingId: payload.recording.id,
      });
    }

    // Transform action items to Linear format
    let linearIssues;
    try {
      linearIssues = await Promise.all(
        actionItems.map((item) => linearTransformer.transformActionItem(item))
      );
      logger.info(`Transformed ${linearIssues.length} action items to Linear format`);
    } catch (error) {
      logger.error('Failed to transform action items:', error);
      return NextResponse.json(
        { error: 'Failed to transform action items' },
        { status: 500 }
      );
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
      
      return NextResponse.json({
        message: 'Review created - pending approval in webapp',
        reviewId,
        reviewUrl: `${baseUrl}/reviews/${reviewId}`,
        actionItemsCount: actionItems.length,
        reviewRequired: true,
        recordingId: payload.recording.id,
      });
    } catch (error) {
      logger.error('Failed to store review:', error);
      return NextResponse.json(
        { error: 'Failed to store review for approval' },
        { status: 500 }
      );
    }
  } catch (error) {
    logger.error('Webhook processing error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
