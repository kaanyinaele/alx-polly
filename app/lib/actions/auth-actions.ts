'use server';

import { createClient } from '@/lib/supabase/server';
import { LoginFormData, RegisterFormData } from '../types';
import { redirect } from 'next/navigation';

/**
 * Authenticate a user with email and password via Supabase.
 * @param data - The login form data containing email and password.
 * @returns An object with an error message on failure, or { error: null } on success.
 */
export async function login(data: LoginFormData) {
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email: data.email,
    password: data.password,
  });

  if (error) {
    return { error: error.message };
  }

  // Success: no error
  return { error: null };
}

/**
 * Register a new user with Supabase auth.
 * Also stores basic profile metadata (e.g., name).
 * @param data - The registration form data.
 * @returns An object with an error message on failure, or { error: null } on success.
 */
export async function register(data: RegisterFormData) {
  const supabase = await createClient();

  const { error } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      data: {
        name: data.name,
      },
    },
  });

  if (error) {
    return { error: error.message };
  }

  // Success: no error
  return { error: null };
}

/**
 * Sign the current user out of the session.
 * @param _formData - Optional form data.
 * @returns void
 */
export async function logout(_formData?: FormData): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();
  if (error) {
    // Swallow error to avoid leaking details in the UI; stay on the same page
    return;
  }
  // Redirect to login after successful sign out
  redirect('/login');
}

/**
 * Get the currently authenticated user from the server context.
 * @returns The Supabase User object, or null if not authenticated.
 */
export async function getCurrentUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user;
}

/**
 * Get the current auth session from the server context.
 * @returns The Supabase Session object, or null if there is no active session.
 */
export async function getSession() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getSession();
  return data.session;
}
