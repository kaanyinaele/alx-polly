'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

// Function to check if a user is admin
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

// Get all polls for admin (will be protected by the checkAdminAccess function)
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

// Admin-level delete poll function
export async function adminDeletePoll(pollId: string) {
  await checkAdminAccess(); // This will redirect if not admin
  
  const supabase = await createClient();
  const { error } = await supabase
    .from('polls')
    .delete()
    .eq('id', pollId);
  
  if (error) return { error: error.message };
  return { error: null };
}
