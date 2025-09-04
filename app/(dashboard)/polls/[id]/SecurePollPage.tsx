'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { submitVote } from '@/app/lib/actions/poll-actions';
import { useAuth } from '@/app/lib/context/auth-context';

interface PollOption {
  text: string;
  votes: number;
}

interface PollData {
  id: string;
  question: string;
  options: string[];
  user_id: string;
  created_at: string;
  votes?: { option_index: number; count: number }[];
}

interface SecurePollPageProps {
  poll: PollData;
  userVoted: boolean;
  csrfToken: string;
}

export default function SecurePollPage({ poll, userVoted: initialUserVoted, csrfToken }: SecurePollPageProps) {
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [hasVoted, setHasVoted] = useState(initialUserVoted);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { user } = useAuth();
  const router = useRouter();
  
  // Process vote data for display
  const votesByOption: Record<number, number> = {};
  
  // Initialize all options to 0 votes
  poll.options.forEach((_, index) => {
    votesByOption[index] = 0;
  });
  
  // Then add actual vote counts
  if (poll.votes) {
    poll.votes.forEach(vote => {
      votesByOption[vote.option_index] = vote.count;
    });
  }
  
  const totalVotes = Object.values(votesByOption).reduce((sum, count) => sum + count, 0);

  const handleVote = async () => {
    if (selectedOption === null) return;
    
    if (!user) {
      setErrorMessage('You must be logged in to vote');
      return;
    }
    
    setIsSubmitting(true);
    setErrorMessage(null);
    
    // Add CSRF token to form data
    const formData = new FormData();
    formData.append('csrf_token', csrfToken);
    
    try {
      const result = await submitVote(poll.id, selectedOption);
      
      if (result.error) {
        setErrorMessage(result.error);
        setIsSubmitting(false);
      } else {
        setHasVoted(true);
        setIsSubmitting(false);
        router.refresh(); // Refresh to get updated vote counts
      }
    } catch (error) {
      setErrorMessage('Failed to submit vote. Please try again.');
      setIsSubmitting(false);
    }
  };

  const getPercentage = (votes: number) => {
    if (totalVotes === 0) return 0;
    return Math.round((votes / totalVotes) * 100);
  };

  const isOwner = user && user.id === poll.user_id;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/polls" className="text-blue-600 hover:underline">
          &larr; Back to Polls
        </Link>
        {isOwner && (
          <div className="flex space-x-2">
            <Button variant="outline" asChild>
              <Link href={`/polls/${poll.id}/edit`}>Edit Poll</Link>
            </Button>
            <Button 
              variant="outline" 
              className="text-red-500 hover:text-red-700"
              onClick={() => {
                if (confirm('Are you sure you want to delete this poll?')) {
                  // Delete action would go here
                  router.push('/polls');
                }
              }}
            >
              Delete
            </Button>
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{poll.question}</CardTitle>
          <CardDescription>Created: {new Date(poll.created_at).toLocaleDateString()}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-md">
              {errorMessage}
            </div>
          )}
          
          {!hasVoted ? (
            <div className="space-y-3">
              {poll.options.map((option, index) => (
                <div 
                  key={index} 
                  className={`p-3 border rounded-md cursor-pointer transition-colors ${selectedOption === index ? 'border-blue-500 bg-blue-50' : 'hover:bg-slate-50'}`}
                  onClick={() => setSelectedOption(index)}
                >
                  {option}
                </div>
              ))}
              <Button 
                onClick={handleVote} 
                disabled={selectedOption === null || isSubmitting} 
                className="mt-4"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Vote'}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <h3 className="font-medium">Results:</h3>
              {poll.options.map((option, index) => (
                <div key={index} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>{option}</span>
                    <span>{getPercentage(votesByOption[index])}% ({votesByOption[index]} votes)</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2.5">
                    <div 
                      className="bg-blue-500 h-2.5 rounded-full" 
                      style={{ width: `${getPercentage(votesByOption[index])}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
        <CardFooter className="text-sm text-gray-500">
          Total votes: {totalVotes}
        </CardFooter>
      </Card>
    </div>
  );
}
