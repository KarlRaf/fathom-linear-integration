import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs'; // Explicitly set runtime for Vercel compatibility

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log('Test route handler executing!', params.id);
  return NextResponse.json({ 
    success: true, 
    id: params.id,
    message: 'Test route works!'
  });
}
