import { NextRequest, NextResponse } from 'next/server';
import { reviewStorage } from '../../../../src/services/review/review-storage';

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
        await reviewStorage.updateReviewStatus(reviewId, 'rejected');
        results.push({ reviewId, success: true });
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
    console.error('Failed to bulk reject reviews:', error);
    return NextResponse.json(
      { error: 'Failed to bulk reject reviews' },
      { status: 500 }
    );
  }
}
