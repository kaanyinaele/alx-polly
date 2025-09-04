'use server';

import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import crypto from 'crypto';

// Generate a random CSRF token
export async function generateCsrfToken(): Promise<string> {
  const token = crypto.randomBytes(32).toString('hex');
  const cookieStore = cookies();
  
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

// Validate a CSRF token
export async function validateCsrfToken(token: string): Promise<boolean> {
  const cookieStore = cookies();
  const storedToken = cookieStore.get('csrf_token')?.value;
  
  if (!storedToken || !token || token !== storedToken) {
    return false;
  }
  
  // Generate a new token after validation to prevent replay attacks
  await generateCsrfToken();
  
  return true;
}

// Middleware to verify CSRF token for state-changing operations
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
