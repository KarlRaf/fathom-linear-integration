import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { LinearClient } from '@linear/sdk';

const REVIEW_PREFIX = 'pending_review:';

// Note: This creates Linear issues for approved items
// In a production setup, you might want to call a backend service instead
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const reviewId = searchParams.get('reviewId');
    
    if (!reviewId) {
      return NextResponse.json(
        { error: 'Review ID is required' },
        { status: 400 }
      );
    }
    
    const key = `${REVIEW_PREFIX}${reviewId}`;
    
    const data = await kv.get<string | any>(key);
    if (!data) {
      return NextResponse.json(
        { error: 'Review not found' },
        { status: 404 }
      );
    }
    
    const review = typeof data === 'string' ? JSON.parse(data) : data;
    
    // Check if review is in a state that can be finalized
    if (review.status === 'approved' || review.status === 'rejected') {
      return NextResponse.json(
        { error: 'Review has already been processed' },
        { status: 400 }
      );
    }
    
    // Get approved issue indices
    const approvedIndices = review.approvedIssueIndices || [];
    if (approvedIndices.length === 0) {
      return NextResponse.json(
        { error: 'No issues approved for creation' },
        { status: 400 }
      );
    }
    
    // Get Linear API key from environment
    const linearApiKey = process.env.LINEAR_API_KEY;
    if (!linearApiKey) {
      return NextResponse.json(
        { error: 'Linear API key not configured' },
        { status: 500 }
      );
    }
    
    // Create Linear client
    const linearClient = new LinearClient({ apiKey: linearApiKey });
    
    // Get the issues to create (use editedLinearIssues if available, otherwise linearIssues)
    const issuesToCreate = review.editedLinearIssues || review.linearIssues;
    const approvedIssues = approvedIndices.map((index: number) => issuesToCreate[index]).filter(Boolean);
    
    // Create issues in Linear
    const createdIssues: Array<{ id: string; url: string; title: string }> = [];
    const errors: Array<{ title: string; error: string }> = [];
    
    for (const issueInput of approvedIssues) {
      try {
        const issuePayload = await linearClient.createIssue({
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
        
        // Small delay to respect rate limits
        await new Promise((resolve) => setTimeout(resolve, 200));
      } catch (error: any) {
        errors.push({
          title: issueInput.title,
          error: error?.message || String(error),
        });
      }
    }
    
    // Update review status
    review.status = 'approved';
    review.approvedAt = new Date().toISOString();
    review.completedAt = new Date().toISOString();
    
    await kv.set(key, JSON.stringify(review));
    
    return NextResponse.json({
      success: true,
      review,
      createdIssues,
      createdIssueIds: createdIssues.map(issue => issue.id), // Keep for backward compatibility
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error(`Failed to finalize review:`, error);
    return NextResponse.json(
      { error: 'Failed to finalize review' },
      { status: 500 }
    );
  }
}
