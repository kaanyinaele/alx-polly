import { createBrowserClient } from '@supabase/ssr';

/**
 * Create a Supabase browser client for use in client components and hooks.
 * Uses NEXT_PUBLIC env vars and should only be called on the client.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
