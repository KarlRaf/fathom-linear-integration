import { NextRequest, NextResponse } from 'next/server';
import { reviewStorage } from '../../../../src/services/review/review-storage';
import { LinearClient } from '@linear/sdk';
import { getLinearConfig } from '../../../../src/utils/linear-config';

export async function POST(request: NextRequest) {
  try {
    const { reviewIds } = await request.json();
    
    if (!Array.isArray(reviewIds) || reviewIds.length === 0) {
      return NextResponse.json(
        { error: 'Invalid review IDs' },
        { status: 400 }
      );
    }
    
    const results = [];
    for (const reviewId of reviewIds) {
      try {
        const review = await reviewStorage.getReview(reviewId);
        if (!review) {
          results.push({ reviewId, success: false, error: 'Review not found' });
          continue;
        }
        
        // Create Linear issues for all action items
        const issuesToCreate = review.linearIssues || [];
        const createdIssues: Array<{ id: string; url: string; title: string }> = [];
        const errors: Array<{ title: string; error: string }> = [];
        
        for (const issueInput of issuesToCreate) {
          try {
            const issue = await linearClient.createIssue({
              teamId: issueInput.teamId,
              title: issueInput.title,
              description: issueInput.description,
              assigneeId: issueInput.assigneeId,
              projectId: issueInput.projectId,
              priority: issueInput.priority,
              dueDate: issueInput.dueDate,
              stateId: issueInput.stateId,
            });
            
            const issue = await issuePayload.issue;
            if (issue?.id && issue?.url) {
              createdIssues.push({
                id: issue.id,
                url: issue.url,
                title: issue.title || issueInput.title,
              });
            }
            
            await new Promise((resolve) => setTimeout(resolve, 200));
          } catch (error: any) {
            errors.push({
              title: issueInput.title,
              error: error?.message || String(error),
            });
          }
        }
        
        // Update review status
        await reviewStorage.updateReviewStatus(reviewId, 'approved');
        
        // Update additional fields manually using KV
        const { kv } = await import('@vercel/kv');
        const key = `pending_review:${reviewId}`;
        const data = await kv.get<string | any>(key);
        if (data) {
          const updatedReview = typeof data === 'string' ? JSON.parse(data) : data;
          updatedReview.approvedAt = new Date().toISOString();
          updatedReview.completedAt = new Date().toISOString();
          updatedReview.approvedIssueIndices = issuesToCreate.map((_: any, index: number) => index);
          await kv.set(key, JSON.stringify(updatedReview));
        }
        
        results.push({
          reviewId,
          success: true,
          createdIssues,
          createdCount: createdIssues.length,
          errorCount: errors.length,
        });
      } catch (error: any) {
        results.push({
          reviewId,
          success: false,
          error: error?.message || String(error),
        });
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;
    
    return NextResponse.json({
      success: true,
      results,
      summary: {
        total: reviewIds.length,
        successful: successCount,
        failed: failCount,
      },
    });
  } catch (error) {
    console.error('Failed to bulk approve reviews:', error);
    return NextResponse.json(
      { error: 'Failed to bulk approve reviews' },
      { status: 500 }
    );
  }
}
