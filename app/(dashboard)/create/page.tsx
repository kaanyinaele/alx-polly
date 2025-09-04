import PollCreateForm from "./PollCreateForm";
import { generateCsrfToken } from "@/app/lib/csrf";

export default async function CreatePollPage() {
  // Generate a CSRF token for form protection
  const csrfToken = await generateCsrfToken();

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold mb-6">Create a New Poll</h1>
      <PollCreateForm csrfToken={csrfToken} />
    </main>
  );
}