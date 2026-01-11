import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

const REVIEW_PREFIX = 'pending_review:';

export async function POST(
  request: NextRequest,
  { params }: { params: { reviewId: string; issueIndex: string } }
) {
  try {
    const reviewId = params.reviewId;
    const issueIndex = parseInt(params.issueIndex, 10);
    const key = `${REVIEW_PREFIX}${reviewId}`;
    
    const data = await kv.get<string | any>(key);
    if (!data) {
      return NextResponse.json(
        { error: 'Review not found' },
        { status: 404 }
      );
    }
    
    const review = typeof data === 'string' ? JSON.parse(data) : data;
    
    // Initialize arrays if needed
    if (!review.approvedIssueIndices) review.approvedIssueIndices = [];
    if (!review.rejectedIssueIndices) review.rejectedIssueIndices = [];
    
    // Check if already processed
    if (review.approvedIssueIndices.includes(issueIndex)) {
      return NextResponse.json({ success: true, message: 'Issue already approved', review });
    }
    
    // Add to approved list, remove from rejected if present
    if (!review.approvedIssueIndices.includes(issueIndex)) {
      review.approvedIssueIndices.push(issueIndex);
    }
    review.rejectedIssueIndices = review.rejectedIssueIndices.filter((i: number) => i !== issueIndex);
    
    // Update status
    const totalIssues = review.linearIssues?.length || 0;
    const approvedCount = review.approvedIssueIndices.length;
    
    if (approvedCount === totalIssues && totalIssues > 0) {
      review.status = 'approved';
      review.approvedAt = new Date().toISOString();
      review.completedAt = new Date().toISOString();
    } else if (approvedCount > 0) {
      review.status = 'partially-approved';
    }
    
    await kv.set(key, JSON.stringify(review));
    
    return NextResponse.json({ success: true, review });
  } catch (error) {
    console.error(`Failed to approve issue ${params.issueIndex} in review ${params.reviewId}:`, error);
    return NextResponse.json(
      { error: 'Failed to approve issue' },
      { status: 500 }
    );
  }
}
