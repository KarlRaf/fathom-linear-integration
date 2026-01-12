import { NextRequest, NextResponse } from 'next/server';
import { reviewStorage } from '../../../../src/services/review/review-storage';

export async function GET(
  request: NextRequest,
  { params }: { params: { reviewId: string } }
) {
  try {
    const reviewId = params.reviewId;
    
    if (!reviewId) {
      return NextResponse.json(
        { error: 'Review ID is required' },
        { status: 400 }
      );
    }
    
    console.log(`Fetching review: ${reviewId}`);
    const review = await reviewStorage.getReview(reviewId);
    
    if (!review) {
      console.log(`Review not found: ${reviewId}`);
      return NextResponse.json(
        { error: 'Review not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(review);
  } catch (error) {
    console.error(`Failed to get review ${params?.reviewId || 'unknown'}:`, error);
    return NextResponse.json(
      { error: 'Failed to get review', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
