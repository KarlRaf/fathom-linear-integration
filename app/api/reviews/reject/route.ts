import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

const REVIEW_PREFIX = 'pending_review:';

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
    
    // Update status
    review.status = 'rejected';
    review.rejectedAt = new Date().toISOString();
    review.completedAt = new Date().toISOString();
    
    await kv.set(key, JSON.stringify(review));
    
    return NextResponse.json({ success: true, review });
  } catch (error) {
    console.error(`Failed to reject review:`, error);
    return NextResponse.json(
      { error: 'Failed to reject review' },
      { status: 500 }
    );
  }
}
