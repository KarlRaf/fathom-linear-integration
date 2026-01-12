import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

const REVIEW_PREFIX = 'pending_review:';
const REVIEW_LIST_KEY = 'pending_reviews:list';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const status = searchParams.get('status') || 'pending';
    const search = searchParams.get('search') || '';
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const minItems = searchParams.get('minItems');
    const maxItems = searchParams.get('maxItems');
    
    const reviewIds = await kv.smembers(REVIEW_LIST_KEY) as string[];
    if (!reviewIds || reviewIds.length === 0) {
      return NextResponse.json([]);
    }
    
    const reviews = [];
    for (const reviewId of reviewIds) {
      const data = await kv.get<string | any>(`${REVIEW_PREFIX}${reviewId}`);
      if (!data) continue;
      
      const review = typeof data === 'string' ? JSON.parse(data) : data;
      
      // Apply filters
      if (status && review.status !== status && status !== 'all') continue;
      if (from && review.createdAt < from) continue;
      if (to && review.createdAt > to) continue;
      if (search) {
        const searchLower = search.toLowerCase();
        if (!review.meetingTitle?.toLowerCase().includes(searchLower) &&
            !review.recordingId?.toLowerCase().includes(searchLower)) {
          continue;
        }
      }
      if (minItems && review.actionItems?.length < parseInt(minItems, 10)) continue;
      if (maxItems && review.actionItems?.length > parseInt(maxItems, 10)) continue;
      
      reviews.push({
        reviewId: review.reviewId,
        meetingTitle: review.meetingTitle,
        timestamp: review.timestamp,
        createdAt: review.createdAt,
        actionItemsCount: review.actionItems?.length || 0,
        status: review.status,
        recordingId: review.recordingId,
        domain: review.domain,
      });
    }
    
    // Sort: pending first, then approved, then by timestamp (newest first)
    const statusOrder: Record<string, number> = {
      'pending': 0,
      'partially-approved': 1,
      'approved': 2,
      'rejected': 3,
      'expired': 4,
    };
    
    reviews.sort((a, b) => {
      const statusA = statusOrder[a.status] ?? 99;
      const statusB = statusOrder[b.status] ?? 99;
      
      // First sort by status priority
      if (statusA !== statusB) {
        return statusA - statusB;
      }
      
      // Then sort by timestamp (newest first)
      return b.timestamp - a.timestamp;
    });
    
    return NextResponse.json(reviews);
  } catch (error) {
    console.error('Failed to list reviews:', error);
    return NextResponse.json(
      { error: 'Failed to list reviews' },
      { status: 500 }
    );
  }
}
