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
    if (review.rejectedIssueIndices.includes(issueIndex)) {
      return NextResponse.json({ success: true, message: 'Issue already rejected', review });
    }
    
    // Add to rejected list, remove from approved if present
    if (!review.rejectedIssueIndices.includes(issueIndex)) {
      review.rejectedIssueIndices.push(issueIndex);
    }
    review.approvedIssueIndices = review.approvedIssueIndices.filter((i: number) => i !== issueIndex);
    
    await kv.set(key, JSON.stringify(review));
    
    return NextResponse.json({ success: true, review });
  } catch (error) {
    console.error(`Failed to reject issue ${params.issueIndex} in review ${params.reviewId}:`, error);
    return NextResponse.json(
      { error: 'Failed to reject issue' },
      { status: 500 }
    );
  }
}
