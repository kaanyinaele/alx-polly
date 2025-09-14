import { getPollById } from '@/app/lib/actions/poll-actions';
import { notFound, redirect } from 'next/navigation';
// Import the client component
import EditPollForm from './EditPollForm';
import { createClient } from '@/lib/supabase/server';
import { generateCsrfToken } from '@/app/lib/csrf';

export default async function EditPollPage({ params }: { params: { id: string } }) {
  const { poll, error } = await getPollById(params.id);
  const supabase = await createClient();
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();

  if (error || !poll) {
    notFound();
  }
  
  // Check if user owns this poll or redirect
  if (!user || poll.user_id !== user.id) {
    // Redirect to the poll view instead of edit
    redirect(`/polls/${params.id}`);
  }

  // Generate CSRF token for the edit form
  const csrfToken = await generateCsrfToken();

  return (
    <div className="max-w-md mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Edit Poll</h1>
      <EditPollForm poll={poll} csrfToken={csrfToken} />
    </div>
  );
}