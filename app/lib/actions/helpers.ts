"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function getAuthenticatedUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User not authenticated.");
  }

  return user;
}

export async function validatePollOwnership(pollId: string) {
  const user = await getAuthenticatedUser();
  const supabase = await createSupabaseServerClient();
  const { data: poll, error } = await supabase
    .from("polls")
    .select("user_id")
    .eq("id", pollId)
    .single();

  if (error || !poll) {
    throw new Error("Poll not found.");
  }

  if (poll.user_id !== user.id) {
    throw new Error("User is not the owner of the poll.");
  }
}
