import { NextRequest, NextResponse } from 'next/server';

const AUTH_COOKIE_NAME = 'tradeflux-auth';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/dashboard')) {
    const authCookie = request.cookies.get(AUTH_COOKIE_NAME)?.value;
    // Avoid hard redirect on first load; client-side guard handles auth state.
    if (authCookie && authCookie !== '1') {
      const redirectUrl = new URL('/', request.url);
      return NextResponse.redirect(redirectUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*'],
};
