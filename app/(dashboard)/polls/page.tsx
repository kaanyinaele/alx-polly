// Dashboard page listing polls owned by the authenticated user
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { getUserPolls } from '@/app/lib/actions/poll-actions';
import { generateCsrfToken } from '@/app/lib/csrf';
import PollActions from './PollActions'; 
import { FilePlusIcon } from 'lucide-react';

export default async function PollsPage() {
  const { polls, error } = await getUserPolls();
  const csrfToken = await generateCsrfToken();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">My Polls</h1>
        <Button asChild>
          <Link href="/create">Create New Poll</Link>
        </Button>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {polls && polls.length > 0 ? (
          polls.map((poll) => <PollActions key={poll.id} poll={poll} csrfToken={csrfToken} />)
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-center col-span-full border-2 border-dashed rounded-lg">
            <FilePlusIcon className="w-16 h-16 text-muted-foreground" />
            <h2 className="text-xl font-semibold mt-4">No polls yet</h2>
            <p className="text-muted-foreground mt-2 mb-6">Create your first poll to get started</p>
            <Button asChild>
              <Link href="/create">Create New Poll</Link>
            </Button>
          </div>
        )}
      </div>
      {error && <div className="text-red-500">{error}</div>}
    </div>
  );
}