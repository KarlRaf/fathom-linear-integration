import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

const REVIEW_PREFIX = 'pending_review:';

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const reviewId = searchParams.get('reviewId');
    const indexParam = searchParams.get('index');
    
    if (!reviewId) {
      return NextResponse.json(
        { error: 'Review ID is required' },
        { status: 400 }
      );
    }
    
    if (indexParam === null) {
      return NextResponse.json(
        { error: 'Index is required' },
        { status: 400 }
      );
    }
    
    const index = parseInt(indexParam, 10);
    const key = `${REVIEW_PREFIX}${reviewId}`;
    
    const data = await kv.get<string | any>(key);
    if (!data) {
      return NextResponse.json(
        { error: 'Review not found' },
        { status: 404 }
      );
    }
    
    const review = typeof data === 'string' ? JSON.parse(data) : data;
    const updates = await request.json();
    
    // Initialize editedActionItems if needed
    if (!review.editedActionItems) {
      review.editedActionItems = JSON.parse(JSON.stringify(review.actionItems));
    }
    
    // Validate index
    if (index < 0 || index >= review.editedActionItems.length) {
      return NextResponse.json(
        { error: 'Invalid action item index' },
        { status: 400 }
      );
    }
    
    // Update the action item
    review.editedActionItems[index] = {
      ...review.editedActionItems[index],
      ...updates,
    };
    review.hasEdits = true;
    
    await kv.set(key, JSON.stringify(review));
    
    return NextResponse.json({ success: true, actionItem: review.editedActionItems[index] });
  } catch (error) {
    console.error(`Failed to update action item:`, error);
    return NextResponse.json(
      { error: 'Failed to update action item' },
      { status: 500 }
    );
  }
}
