import Link from "next/link";
import { Logo } from "@/components/site/Logo";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col items-start justify-center gap-6 px-6">
      <Logo />
      <h1 className="text-4xl font-semibold tracking-tighter">We couldn&apos;t find that page.</h1>
      <p className="text-muted">The talk or event may have moved, or it isn&apos;t published yet.</p>
      <Link href="/" className="rounded-full bg-g-blue px-6 py-3 font-medium text-white">
        Back to all events
      </Link>
    </div>
  );
}
