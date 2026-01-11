import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Public routes that don't require authentication
const PUBLIC_ROUTES = ['/login', '/api/auth/login', '/api/auth/logout', '/api/auth/check'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes
  if (PUBLIC_ROUTES.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Allow API routes that are not auth-related (webhooks, etc.)
  if (pathname.startsWith('/api/')) {
    // Only protect settings and reviews API routes
    if (pathname.startsWith('/api/settings') || pathname.startsWith('/api/reviews')) {
      const token = request.cookies.get('auth-token')?.value;
      if (!token) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }
    return NextResponse.next();
  }

  // Check authentication for pages
  const token = request.cookies.get('auth-token')?.value;
  if (!token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
