"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

/**
 * Create a new poll owned by the authenticated user.
 * Performs CSRF validation, input sanitization, and basic constraints.
 * @param formData - FormData containing: question (string), options (string[]), csrf_token (string)
 * @returns { error: string | null }
 */
export async function createPoll(formData: FormData) {
  const supabase = await createClient();

  // Validate CSRF token first
  try {
    const csrfToken = formData.get("csrf_token") as string;
    if (!csrfToken) {
      return { error: "Missing security token" };
    }
    
    // Import and use the CSRF validation function
    const { validateCsrfToken } = await import("@/app/lib/csrf");
    const isValid = await validateCsrfToken(csrfToken);
    
    if (!isValid) {
      return { error: "Invalid security token. Please refresh the page and try again." };
    }
  } catch (error) {
    return { error: "Security validation failed. Please try again." };
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

  // Get user from session
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError) {
    return { error: userError.message };
  }
  if (!user) {
    return { error: "You must be logged in to create a poll." };
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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { polls: [], error: "Not authenticated" };

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
 * @param csrfToken - Optional CSRF token for validation.
 */
export async function submitVote(pollId: string, optionIndex: number, csrfToken?: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  
  // Optional: Enforce CSRF token if provided by the client (recommended)
  try {
    const { validateCsrfToken } = await import("@/app/lib/csrf");
    if (!csrfToken) {
      return { error: "Missing security token" };
    }
    const isValid = await validateCsrfToken(csrfToken);
    if (!isValid) {
      return { error: "Invalid security token. Please refresh and try again." };
    }
  } catch {
    return { error: "Security validation failed. Please try again." };
  }
  
  // Require login to vote - this prevents anonymous vote stuffing
  if (!user) return { error: "You must be logged in to vote." };

  // Check if user has already voted on this poll
  const { data: existingVotes, error: checkError } = await supabase
    .from("votes")
    .select("id")
    .eq("poll_id", pollId)
    .eq("user_id", user.id);
    
  if (checkError) return { error: checkError.message };
  
  // If user has already voted, prevent multiple votes
  if (existingVotes && existingVotes.length > 0) {
    return { error: "You have already voted on this poll." };
  }
  
  // Validate option index
  const { data: poll, error: pollError } = await supabase
    .from("polls")
    .select("options")
    .eq("id", pollId)
    .single();
    
  if (pollError) return { error: pollError.message };
  if (!poll) return { error: "Poll not found" };
  
  // Check if option index is valid
  if (optionIndex < 0 || optionIndex >= poll.options.length) {
    return { error: "Invalid option selected" };
  }
  
  // Insert the vote with user tracking
  const { error } = await supabase.from("votes").insert([
    {
      poll_id: pollId,
      user_id: user.id,
      option_index: optionIndex,
      ip_address: null, // Could store IP hash for anonymous users if needed
    },
  ]);

  if (error) return { error: error.message };
  
  // Revalidate the poll detail page to reflect updated counts if using data cache
  try {
    revalidatePath(`/polls/${pollId}`);
  } catch {}
  return { error: null };
}

/**
 * Delete a poll if the current user is the owner.
 * CSRF-protected to prevent cross-site request forgery.
 * @param id - The poll id to delete.
 * @param csrfToken - CSRF token provided by the client.
 */
export async function deletePoll(id: string, csrfToken?: string) {
  const supabase = await createClient();
  
  // CSRF validation (parity with other mutations)
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
  
  // Get user from session
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  
  if (userError) return { error: userError.message };
  if (!user) return { error: "You must be logged in to delete a poll." };
  
  // Check if the user is the owner of the poll
  const { data: poll, error: fetchError } = await supabase
    .from("polls")
    .select("user_id")
    .eq("id", id)
    .single();
    
  if (fetchError) return { error: fetchError.message };
  if (!poll) return { error: "Poll not found" };
  if (poll.user_id !== user.id) return { error: "You can only delete your own polls" };
  
  // Now perform the delete operation
  const { error } = await supabase.from("polls").delete().eq("id", id);
  if (error) return { error: error.message };
  
  // Revalidate the list page
  revalidatePath("/polls");
  return { error: null };
}

/**
 * Update a poll's question and options, only by its owner.
 * Performs validation and sanitization similar to createPoll.
 * @param pollId - The poll id to update.
 * @param formData - FormData with question and options.
 */
export async function updatePoll(pollId: string, formData: FormData) {
  const supabase = await createClient();

  // Enforce CSRF validation similar to createPoll
  try {
    const csrfToken = formData.get("csrf_token") as string;
    if (!csrfToken) {
      return { error: "Missing security token" };
    }
    const { validateCsrfToken } = await import("@/app/lib/csrf");
    const isValid = await validateCsrfToken(csrfToken);
    if (!isValid) {
      return { error: "Invalid security token. Please refresh the page and try again." };
    }
  } catch (error) {
    return { error: "Security validation failed. Please try again." };
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

  // Get user from session
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError) {
    return { error: userError.message };
  }
  if (!user) {
    return { error: "You must be logged in to update a poll." };
  }

  // Check if the poll exists and belongs to the user
  const { data: existingPoll, error: fetchError } = await supabase
    .from("polls")
    .select("user_id")
    .eq("id", pollId)
    .single();
    
  if (fetchError) {
    return { error: fetchError.message };
  }
  
  if (!existingPoll) {
    return { error: "Poll not found" };
  }
  
  if (existingPoll.user_id !== user.id) {
    return { error: "You can only update your own polls" };
  }

  // Create sanitized versions of inputs
  const sanitizedQuestion = question
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .trim();
    
  const sanitizedOptions = options.map(opt => 
    opt.replace(/</g, '&lt;').replace(/>/g, '&gt;').trim()
  );

  // Only allow updating polls owned by the user
  const { error } = await supabase
    .from("polls")
    .update({ 
      question: sanitizedQuestion, 
      options: sanitizedOptions
    })
    .eq("id", pollId)
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message };
  }

  // Revalidate relevant paths to reflect updates
  try {
    revalidatePath("/polls");
    revalidatePath(`/polls/${pollId}`);
  } catch {}

  return { error: null };
}
