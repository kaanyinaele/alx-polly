import { getPollById } from '@/app/lib/actions/poll-actions';
import { notFound } from 'next/navigation';
import SecurePollPage from './SecurePollPage';
import { createClient } from '@/lib/supabase/server';
import { generateCsrfToken } from '@/app/lib/csrf';

export default async function PollDetailPage({ params }: { params: { id: string } }) {
  // Get poll data
  const { poll, error } = await getPollById(params.id);
  
  // Generate a CSRF token for voting
  const csrfToken = await generateCsrfToken();

  if (error || !poll) {
    notFound();
  }
  
  // Check if the current user has already voted
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  let userVoted = false;
  
  if (user) {
    const { data: votes } = await supabase
      .from('votes')
      .select('id')
      .eq('poll_id', params.id)
      .eq('user_id', user.id);
    
    userVoted = !!votes && votes.length > 0;
  }
  
  // Get vote counts for this poll
  const { data: voteStats } = await supabase
    .from('votes')
    .select('option_index, count')
    .eq('poll_id', params.id)
    .group('option_index');
  
  // Add vote data to the poll
  const pollWithVotes = {
    ...poll,
    votes: voteStats || []
  };

  return <SecurePollPage poll={pollWithVotes} userVoted={userVoted} csrfToken={csrfToken} />;
}
