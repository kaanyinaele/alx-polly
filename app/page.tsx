import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { getCurrentUser } from './lib/actions/auth-actions';

export default async function Home() {
  const user = await getCurrentUser();

  return (
    <main className="flex-1">
      <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48 bg-slate-50">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center space-y-4 text-center">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl/none">
                Create, Share, and Vote on Polls
              </h1>
              <p className="mx-auto max-w-[700px] text-slate-500 md:text-xl dark:text-slate-400">
                ALX Polly is the easiest way to create and share polls with your
                friends, family, or community.
              </p>
            </div>
            <div className="space-x-4">
              <Button asChild>
                <Link href={user ? "/create" : "/register"}>Get Started</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/polls">Browse Polls</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
      <section className="w-full py-12 md:py-24 lg:py-32">
        <div className="container px-4 md:px-6">
          <div className="grid items-center gap-6 lg:grid-cols-[1fr_500px] lg:gap-12 xl:grid-cols-[1fr_550px]">
            <div className="flex flex-col justify-center space-y-4">
              <div className="space-y-2">
                <div className="inline-block rounded-lg bg-slate-100 px-3 py-1 text-sm dark:bg-slate-800">
                  Key Features
                </div>
                <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">
                  Everything You Need for Polling
                </h2>
                <p className="max-w-[600px] text-slate-500 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed dark:text-slate-400">
                  From creating polls with multiple options to viewing detailed
                  results, ALX Polly has you covered.
                </p>
              </div>
              <ul className="grid gap-2 py-4">
                <li>
                  <CheckIcon className="mr-2 inline-block h-4 w-4" />
                  Easy Poll Creation
                </li>
                <li>
                  <CheckIcon className="mr-2 inline-block h-4 w-4" />
                  Real-time Voting and Results
                </li>
                <li>
                  <CheckIcon className="mr-2 inline-block h-4 w-4" />
                  Secure and Private
                </li>
              </ul>
            </div>
            <img
              alt="Image"
              className="mx-auto aspect-video overflow-hidden rounded-xl object-cover object-center sm:w-full lg:order-last"
              height="310"
              src="/placeholder.svg"
              width="550"
            />
          </div>
        </div>
      </section>
    </main>
  );
}

function CheckIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
