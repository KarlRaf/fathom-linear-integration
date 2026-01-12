import { NextRequest, NextResponse } from 'next/server';
import { ActionItemExtractor } from '../../../../src/services/ai/action-extractor';
import { LinearTransformer } from '../../../../src/services/linear/transformer';
import { reviewStorage } from '../../../../src/services/review/review-storage';
import { GitHubLogger } from '../../../../src/services/github/logger';
import { getLinearConfig } from '../../../../src/utils/linear-config';
import { config } from '../../../../src/config/env';
import { logger } from '../../../../src/utils/logger';

const actionExtractor = new ActionItemExtractor(config.openai.apiKey);

export async function POST(request: NextRequest) {
  try {
    const { transcript, summary, meetingTitle, domain } = await request.json();
    
    // Validation
    if (!transcript || typeof transcript !== 'string' || transcript.trim().length === 0) {
      return NextResponse.json(
        { error: 'Transcript is required and cannot be empty' },
        { status: 400 }
      );
    }
    
    if (transcript.length > 500000) { // ~500KB limit
      return NextResponse.json(
        { error: 'Transcript is too long (max 500,000 characters)' },
        { status: 400 }
      );
    }
    
    // Generate review ID
    const reviewId = `review_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Extract action items
    logger.info(`Extracting action items from manual transcript (${transcript.length} chars)`);
    let actionItems;
    try {
      actionItems = await actionExtractor.extract(transcript, summary || '');
    } catch (error) {
      logger.error('Failed to extract action items from manual transcript:', error);
      return NextResponse.json(
        { error: 'Failed to extract action items from transcript' },
        { status: 500 }
      );
    }
    
    if (actionItems.length === 0) {
      return NextResponse.json(
        { error: 'No action items found in transcript' },
        { status: 400 }
      );
    }
    
    // Get Linear config and create transformer
    const linearConfig = await getLinearConfig();
    const linearTransformer = new LinearTransformer(
      linearConfig.apiKey,
      linearConfig.teamId,
      linearConfig.projectId,
      linearConfig.stateId
    );
    
    // Transform to Linear format
    let linearIssues;
    try {
      linearIssues = await Promise.all(
        actionItems.map(item => linearTransformer.transformActionItem(item))
      );
      logger.info(`Transformed ${linearIssues.length} action items to Linear format`);
    } catch (error) {
      logger.error('Failed to transform action items to Linear format:', error);
      return NextResponse.json(
        { error: 'Failed to transform action items to Linear format' },
        { status: 500 }
      );
    }
    
    // Generate meeting title if not provided
    const finalMeetingTitle = meetingTitle?.trim() || `Manual Review - ${new Date().toLocaleString()}`;
    
    // Create review object
    const reviewData = {
      reviewId,
      actionItems,
      linearIssues,
      recordingId: `manual_${Date.now()}`,
      meetingTitle: finalMeetingTitle,
      summary: summary || '',
      timestamp: Date.now(),
      createdAt: new Date().toISOString(),
      status: 'pending' as const,
      domain: domain?.trim() || undefined,
      approvedIssueIndices: [] as number[],
      rejectedIssueIndices: [] as number[],
    };
    
    // Store review
    try {
      await reviewStorage.storeReview(reviewData);
      logger.info(`Stored manual review ${reviewId} with ${actionItems.length} action items`);
    } catch (error) {
      logger.error('Failed to store manual review:', error);
      return NextResponse.json(
        { error: 'Failed to store review' },
        { status: 500 }
      );
    }
    
    // Log to GitHub (async, don't wait)
    if (config.github.token && config.github.repoOwner && config.github.repoName) {
      try {
        const githubLogger = new GitHubLogger(
          config.github.token,
          config.github.repoOwner,
          config.github.repoName
        );
        
        // Create a mock payload for GitHub logging
        const mockPayload = {
          event: {
            id: `manual_${Date.now()}`,
            event_type: 'recording.completed',
            timestamp: new Date().toISOString(),
          },
          recording: {
            id: `manual_${Date.now()}`,
            title: finalMeetingTitle,
            started_at: new Date().toISOString(),
            ended_at: new Date().toISOString(),
            duration_seconds: 0,
          },
          transcript: { text: transcript },
          summary: summary || '',
          calendar_invitees: domain ? [{ email_domain: domain }] : [],
        };
        
        // Pass explicit domain if provided
        githubLogger.logTranscript(mockPayload, domain?.trim() || undefined).catch(err => {
          logger.error('Failed to log manual transcript to GitHub (non-critical):', err);
        });
      } catch (error) {
        logger.error('Failed to initialize GitHub logger (non-critical):', error);
      }
    }
    
    // Return the review data directly instead of fetching it back
    // This avoids potential KV read-after-write consistency issues
    return NextResponse.json({
      success: true,
      reviewId,
      review: reviewData,
    });
  } catch (error) {
    logger.error('Failed to create manual review:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create review',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
