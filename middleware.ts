import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  // First update session with Supabase
  const response = await updateSession(request);
  
  // Then add security headers
  const secureHeaders = new Headers(response.headers);
  
  // Security headers
  secureHeaders.set('X-Frame-Options', 'DENY'); // Prevents clickjacking
  secureHeaders.set('X-Content-Type-Options', 'nosniff'); // Prevents MIME type sniffing
  secureHeaders.set('Referrer-Policy', 'strict-origin-when-cross-origin'); // Controls referrer information
  secureHeaders.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()'); // Restricts use of browser features
  
  // Content Security Policy
  secureHeaders.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://*.supabase.co;"
  ); // Defines allowed content sources
  
  // Create a new response with the original response and updated headers
  return NextResponse.next({
    request: {
      headers: request.headers,
    },
    headers: secureHeaders,
  });
}

export const config = {
  // Apply middleware to all app routes except static assets and auth pages
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|login|register|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}