"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/navigation";

// CREATE POLL
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

// GET USER POLLS
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

// GET POLL BY ID
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

// SUBMIT VOTE
export async function submitVote(pollId: string, optionIndex: number) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  
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
  return { error: null };
}

// DELETE POLL
export async function deletePoll(id: string) {
  const supabase = await createClient();
  
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
  
  revalidatePath("/polls");
  return { error: null };
}

// UPDATE POLL
export async function updatePoll(pollId: string, formData: FormData) {
  const supabase = await createClient();

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

  return { error: null };
}
