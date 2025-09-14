'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getAuthenticatedUser } from './helpers';
import { csrfProtection } from '@/app/lib/csrf';

/**
 * Guard that ensures the current user is an admin.
 * Redirects to /login if unauthenticated, or /polls if not an admin.
 * @returns The authenticated admin user.
 */
export async function checkAdminAccess() {
  const user = await getAuthenticatedUser();

  // Check if user has admin role
  if (!user.user_metadata?.isAdmin) {
    // Not an admin, redirect to polls page
    redirect('/polls');
  }

  // User is an admin, return user
  return user;
}

/**
 * Fetch all polls for admin dashboard.
 * Protected by checkAdminAccess.
 */
export async function getAdminPolls() {
  await checkAdminAccess(); // This will redirect if not admin

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('polls')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return { polls: [], error: error.message };
  return { polls: data ?? [], error: null };
}

/**
 * Admin-only delete for any poll by id.
 * Protected by checkAdminAccess and CSRF.
 * @param formData - FormData containing poll_id and csrf_token.
 */
export async function adminDeletePoll(formData: FormData) {
  await checkAdminAccess(); // This will redirect if not admin

  try {
    await csrfProtection(formData);
  } catch (error) {
    if (error instanceof Error) {
      return { error: error.message };
    }
    return { error: 'An unknown error occurred during validation.' };
  }

  const pollId = formData.get('poll_id') as string;
  if (!pollId) {
    return { error: 'Missing poll_id' };
  }

  const supabase = await createClient();
  const { error } = await supabase.from('polls').delete().eq('id', pollId);

  if (error) return { error: error.message };
  return { error: null };
}
