import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

const REVIEW_PREFIX = 'pending_review:';

export async function GET(
  request: NextRequest,
  { params }: { params: { reviewId: string } }
) {
  try {
    const reviewId = params.reviewId;
    const data = await kv.get<string | any>(`${REVIEW_PREFIX}${reviewId}`);
    
    if (!data) {
      return NextResponse.json(
        { error: 'Review not found' },
        { status: 404 }
      );
    }
    
    const review = typeof data === 'string' ? JSON.parse(data) : data;
    return NextResponse.json(review);
  } catch (error) {
    console.error(`Failed to get review ${params.reviewId}:`, error);
    return NextResponse.json(
      { error: 'Failed to get review' },
      { status: 500 }
    );
  }
}
