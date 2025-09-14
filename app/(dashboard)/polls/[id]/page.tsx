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
  
  // Get vote counts for this poll (manual aggregation)
  const { data: voteRows } = await supabase
    .from('votes')
    .select('option_index')
    .eq('poll_id', params.id);

  const counts: Record<number, number> = {};
  if (Array.isArray(voteRows)) {
    for (const row of voteRows) {
      const idx = (row as any).option_index as number;
      counts[idx] = (counts[idx] || 0) + 1;
    }
  }

  const voteStats = Object.entries(counts).map(([option_index, count]) => ({
    option_index: Number(option_index),
    count: count as number,
  }));
  
  // Add vote data to the poll
  const pollWithVotes = {
    ...poll,
    votes: voteStats || []
  };

  return <SecurePollPage poll={pollWithVotes} userVoted={userVoted} csrfToken={csrfToken} />;
}
