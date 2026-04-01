// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { SUPPORTED_BOARDS } from './app/lib/board-data';

const SPECIAL_ROUTES = ['angles', 'grades']; // routes that don't need board validation

const USER_SPECIFIC_PARAMS = ['hideAttempted', 'hideCompleted', 'showOnlyAttempted', 'showOnlyCompleted', 'onlyDrafts'];

function getListPageCacheControl(request: NextRequest): string | null {
  const { pathname, searchParams } = request.nextUrl;

  // Fast-path: skip parsing for routes that clearly aren't list pages
  if (!pathname.endsWith('/list')) {
    return null;
  }

  const pathParts = pathname.split('/').filter(Boolean);

  // Must end with /list and have at least 6 segments: board/layout/size/sets/angle/list
  if (pathParts.length < 6 || pathParts[pathParts.length - 1] !== 'list') {
    return null;
  }

  // First segment must be a supported board
  if (!(SUPPORTED_BOARDS as readonly string[]).includes(pathParts[0].toLowerCase())) {
    return null;
  }

  const hasUserSpecificParams = USER_SPECIFIC_PARAMS.some((param) => {
    const value = searchParams.get(param);
    return value !== null && value !== '' && value !== 'false' && value !== '0';
  });

  if (hasUserSpecificParams) {
    return 'private, no-store';
  }

  return 'public, s-maxage=86400, stale-while-revalidate=604800';
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Block PHP requests
  if (pathname.includes('.php')) {
    return new NextResponse(null, {
      status: 404,
      statusText: 'Not Found',
    });
  }

  // Check API routes
  if (pathname.startsWith('/api/v1/')) {
    const pathParts = pathname.split('/');
    if (pathParts.length >= 4) {
      const routeIdentifier = pathParts[3].toLowerCase(); // either a board name or special route

      // Allow special routes to pass through
      if (SPECIAL_ROUTES.includes(routeIdentifier)) {
        return NextResponse.next();
      }

      // For all other routes, validate board name
      if (!(SUPPORTED_BOARDS as readonly string[]).includes(routeIdentifier)) {
        console.info('Middleware board_name check returned 404');
        return new NextResponse(null, {
          status: 404,
          statusText: 'Not Found',
        });
      }
    }
  }

  const cacheControl = getListPageCacheControl(request);
  if (cacheControl !== null) {
    const response = NextResponse.next();
    response.headers.set('Cache-Control', cacheControl);
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/api/v1/:path*',
    // Match all page routes but skip static files, Next.js internals, and Vercel Flags Explorer
    '/((?!_next/static|_next/image|favicon.ico|monitoring|\\.well-known/vercel/flags|.*\\..*).*)',
  ],
};
