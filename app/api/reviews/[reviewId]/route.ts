import { NextRequest, NextResponse } from 'next/server';
import { reviewStorage } from '../../../../src/services/review/review-storage';

export async function GET(
  request: NextRequest,
  { params }: { params: { reviewId: string } }
) {
  try {
    const reviewId = params.reviewId;
    const review = await reviewStorage.getReview(reviewId);
    
    if (!review) {
      return NextResponse.json(
        { error: 'Review not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(review);
  } catch (error) {
    console.error(`Failed to get review ${params.reviewId}:`, error);
    return NextResponse.json(
      { error: 'Failed to get review' },
      { status: 500 }
    );
  }
}
