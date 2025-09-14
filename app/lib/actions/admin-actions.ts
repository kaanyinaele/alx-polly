'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

/**
 * Guard that ensures the current user is an admin.
 * Redirects to /login if unauthenticated, or /polls if not an admin.
 * @returns true when access is allowed.
 */
export async function checkAdminAccess() {
  const supabase = await createClient();
  
  // Get current user
  const { data: { user }, error } = await supabase.auth.getUser();
  
  // If error or no user, redirect to login
  if (error || !user) {
    redirect('/login');
  }
  
  // Check if user has admin role
  if (!user.user_metadata?.isAdmin) {
    // Not an admin, redirect to polls page
    redirect('/polls');
  }
  
  // User is an admin, return true
  return true;
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
 * @param pollId The ID of the poll to delete.
 * @param csrfToken The CSRF token for validation.
 */
export async function adminDeletePoll(pollId: string, csrfToken?: string) {
  await checkAdminAccess(); // This will redirect if not admin

  // CSRF validation for parity with other destructive actions
  try {
    const { validateCsrfToken } = await import("@/app/lib/csrf");
    if (!csrfToken) {
      return { error: "Missing security token" };
    }
    const isValid = await validateCsrfToken(csrfToken);
    if (!isValid) {
      return { error: "Invalid security token. Please refresh the page and try again." };
    }
  } catch (e) {
    return { error: "Security validation failed. Please try again." };
  }
  
  const supabase = await createClient();
  const { error } = await supabase
    .from('polls')
    .delete()
    .eq('id', pollId);
  
  if (error) return { error: error.message };
  return { error: null };
}
