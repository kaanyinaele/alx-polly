'use server';

import { cookies } from 'next/headers';
import crypto from 'crypto';

/**
 * Generate a cryptographically secure CSRF token and set it as an HTTP-only cookie.
 * Rotates the token hourly and marks it secure/sameSite to mitigate XSS/CSRF.
 * @returns hex-encoded token string that can be embedded in a hidden form field.
 */
export async function generateCsrfToken(): Promise<string> {
  const token = crypto.randomBytes(32).toString('hex');
  const cookieStore = await cookies();
  
  // Store the token in a HTTP-only cookie to prevent XSS attacks
  cookieStore.set('csrf_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60, // 1 hour expiry
  });
  
  return token;
}

/**
 * Compare a provided CSRF token against the one stored in cookies.
 * On success, rotates the token to prevent replay.
 */
export async function validateCsrfToken(token: string): Promise<boolean> {
  const cookieStore = await cookies();
  const storedToken = cookieStore.get('csrf_token')?.value;
  
  if (!storedToken || !token || token !== storedToken) {
    return false;
  }
  
  // Generate a new token after validation to prevent replay attacks
  await generateCsrfToken();
  
  return true;
}

/**
 * Helper to enforce CSRF validation for state-changing server actions.
 * Throws on failure to standardize error handling.
 */
export async function csrfProtection(formData: FormData) {
  const token = formData.get('csrf_token') as string;
  
  if (!token) {
    throw new Error('CSRF token missing');
  }
  
  const isValid = await validateCsrfToken(token);
  
  if (!isValid) {
    throw new Error('Invalid or expired CSRF token');
  }
  
  return true;
}
