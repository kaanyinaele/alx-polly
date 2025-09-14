"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getAuthenticatedUser, validatePollOwnership } from "./helpers";
import { csrfProtection } from "@/app/lib/csrf";

/**
 * Create a new poll owned by the authenticated user.
 * Performs CSRF validation, input sanitization, and basic constraints.
 * @param formData - FormData containing: question (string), options (string[]), csrf_token (string)
 * @returns { error: string | null }
 */
export async function createPoll(formData: FormData) {
  const supabase = await createClient();
  try {
    await csrfProtection(formData);
  } catch (error) {
    return { error: "Invalid security token. Please refresh the page and try again." };
  }

  const question = formData.get("question") as string;
  const options = formData.getAll("options").filter(Boolean) as string[];

  // Basic validation
  if (!question || options.length < 2) {
    return { error: "Please provide a question and at least two options." };
  }

  // Additional input validation and sanitization
  if (question.length > 500) {
    return { error: "Question is too long. Maximum 500 characters allowed." };
  }

  // Validate each option
  for (const option of options) {
    if (typeof option !== 'string') {
      return { error: "Invalid option format." };
    }
    
    if (option.length > 200) {
      return { error: "Option text is too long. Maximum 200 characters allowed." };
    }
    
    // Prevent script injections in options
    if (option.includes('<script') || option.includes('javascript:')) {
      return { error: "Invalid characters detected in options." };
    }
  }

  // Prevent script injections in question
  if (question.includes('<script') || question.includes('javascript:')) {
    return { error: "Invalid characters detected in question." };
  }

  let user;
  try {
    user = await getAuthenticatedUser();
  } catch (error) {
    if (error instanceof Error) {
      return { error: error.message };
    }
    return { error: "An unknown authentication error occurred." };
  }

  // Create sanitized versions of inputs
  const sanitizedQuestion = question
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .trim();
    
  const sanitizedOptions = options.map(opt => 
    opt.replace(/</g, '&lt;').replace(/>/g, '&gt;').trim()
  );

  const { error } = await supabase.from("polls").insert([
    {
      user_id: user.id,
      question: sanitizedQuestion,
      options: sanitizedOptions,
    },
  ]);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/polls");
  return { error: null };
}

/**
 * Fetch polls created by the current authenticated user.
 * @returns A list of polls or an error when unauthenticated or on query failure.
 */
export async function getUserPolls() {
  let user;
  try {
    user = await getAuthenticatedUser();
  } catch (error) {
    if (error instanceof Error) {
      return { polls: [], error: error.message };
    }
    return { polls: [], error: "An unknown authentication error occurred." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("polls")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return { polls: [], error: error.message };
  return { polls: data ?? [], error: null };
}

/**
 * Get a single poll by id.
 * @param id - The poll id.
 */
export async function getPollById(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("polls")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return { poll: null, error: error.message };
  return { poll: data, error: null };
}

/**
 * Record a vote for a poll option by the current user.
 * Enforces one-vote-per-user and validates the selected option index.
 * @param pollId - The target poll id.
 * @param optionIndex - Zero-based index of the selected option.
 * @param formData - FormData containing the CSRF token.
 */
export async function submitVote(
  pollId: string,
  optionIndex: number,
  formData: FormData,
) {
  const supabase = await createClient();
  try {
    await csrfProtection(formData);
  } catch (error) {
    return { error: "Invalid security token. Please refresh the page and try again." };
  }

  let user;
  try {
    user = await getAuthenticatedUser();
  } catch (error) {
    if (error instanceof Error) {
      return { error: error.message };
    }
    return { error: "An unknown authentication error occurred." };
  }

  // Fetch the poll to validate the option index
  const { data: poll, error: pollError } = await supabase
    .from("polls")
    .select("options")
    .eq("id", pollId)
    .single();

  if (pollError || !poll) {
    return { error: "Poll not found." };
  }

  if (optionIndex < 0 || optionIndex >= poll.options.length) {
    return { error: "Invalid option selected." };
  }

  // Check if user has already voted
  const { data: existingVote, error: voteCheckError } = await supabase
    .from("votes")
    .select("id")
    .eq("poll_id", pollId)
    .eq("user_id", user.id)
    .single();

  if (voteCheckError && voteCheckError.code !== "PGRST116") {
    // PGRST116: 'exact one row not found' which is expected if user hasn't voted
    return { error: "Error checking for existing votes." };
  }

  if (existingVote) {
    return { error: "You have already voted on this poll." };
  }

  // Record the new vote
  const { error: insertError } = await supabase.from("votes").insert({
    poll_id: pollId,
    user_id: user.id,
    selected_option: optionIndex,
  });

  if (insertError) {
    return { error: "Failed to record vote." };
  }

  revalidatePath(`/polls/${pollId}`);
  revalidatePath(`/polls/${pollId}/results`);

  return { error: null };
}

/**
 * Fetch results for a given poll, including vote counts for each option.
 * @param pollId - The poll id.
 */
export async function getPollResults(pollId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("polls")
    .select("*, votes(*)")
    .eq("id", pollId)
    .single();

  if (error) return { results: null, error: error.message };

  const voteCounts = data.options.map(() => 0);
  for (const vote of data.votes) {
    if (vote.selected_option >= 0 && vote.selected_option < voteCounts.length) {
      voteCounts[vote.selected_option]++;
    }
  }

  return {
    results: {
      ...data,
      voteCounts,
    },
    error: null,
  };
}

/**
 * Delete a poll owned by the current user.
 * @param formData - FormData containing poll_id and csrf_token.
 */
export async function deletePoll(formData: FormData) {
  const pollId = formData.get("poll_id") as string;

  try {
    await csrfProtection(formData);
    await validatePollOwnership(pollId);
  } catch (error) {
    if (error instanceof Error) {
      return { error: error.message };
    }
    return { error: "An unknown error occurred during validation." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("polls").delete().eq("id", pollId);

  if (error) {
    return { error: "Failed to delete poll." };
  }

  revalidatePath("/polls");
  return { error: null };
}
