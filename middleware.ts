import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  // First update session with Supabase
  const response = await updateSession(request);
  
  // Then add security headers
  const secureHeaders = new Headers(response.headers);
  
  // Security headers
  secureHeaders.set('X-Frame-Options', 'DENY');
  secureHeaders.set('X-Content-Type-Options', 'nosniff');
  secureHeaders.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  secureHeaders.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  
  // Content Security Policy
  secureHeaders.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://*.supabase.co;"
  );
  
  // Create a new response with the original response and updated headers
  return NextResponse.next({
    request: {
      headers: request.headers,
    },
    headers: secureHeaders,
  });
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|login|register|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}