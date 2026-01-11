import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

const REVIEW_PREFIX = 'pending_review:';

export async function POST(
  request: NextRequest,
  { params }: { params: { reviewId: string } }
) {
  try {
    const reviewId = params.reviewId;
    const key = `${REVIEW_PREFIX}${reviewId}`;
    
    const data = await kv.get<string | any>(key);
    if (!data) {
      return NextResponse.json(
        { error: 'Review not found' },
        { status: 404 }
      );
    }
    
    const review = typeof data === 'string' ? JSON.parse(data) : data;
    
    // Update status
    review.status = 'rejected';
    review.rejectedAt = new Date().toISOString();
    review.completedAt = new Date().toISOString();
    
    await kv.set(key, JSON.stringify(review));
    
    return NextResponse.json({ success: true, review });
  } catch (error) {
    console.error(`Failed to reject review ${params.reviewId}:`, error);
    return NextResponse.json(
      { error: 'Failed to reject review' },
      { status: 500 }
    );
  }
}
