"use client";

import Link from "next/link";
import { useAuth } from "@/app/lib/context/auth-context";
import { Button } from "@/components/ui/button";
import { deletePoll } from "@/app/lib/actions/poll-actions";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Edit, Trash2 } from "lucide-react";

interface Poll {
  id: string;
  question: string;
  options: any[];
  user_id: string;
}

interface PollActionsProps {
  poll: Poll;
  csrfToken: string;
}

export default function PollActions({ poll, csrfToken }: PollActionsProps) {
  const { user } = useAuth();

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle className="text-lg">
          <Link href={`/polls/${poll.id}`} className="hover:underline">
            {poll.question}
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-grow">
        <p className="text-sm text-muted-foreground">{poll.options.length} options</p>
      </CardContent>
      {user && user.id === poll.user_id && (
        <CardFooter className="flex justify-end gap-2">
          <Button asChild variant="ghost" size="icon">
            <Link href={`/polls/${poll.id}/edit`}><Edit className="h-4 w-4" /></Link>
          </Button>
          <form action={deletePoll}>
            <input type="hidden" name="poll_id" value={poll.id} />
            <input type="hidden" name="csrf_token" value={csrfToken} />
            <Button variant="ghost" size="icon" type="submit" className="text-destructive hover:text-destructive">
              <Trash2 className="h-4 w-4" />
            </Button>
          </form>
        </CardFooter>
      )}
    </Card>
  );
}
