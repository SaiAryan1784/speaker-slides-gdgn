import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/site/Logo";
import { logoutAction } from "@/app/admin/actions";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: { default: "Admin", template: "%s | Admin" }, robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <>
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3 sm:px-6">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
            <Link href="/admin" aria-label="Admin home">
              <Logo />
            </Link>
            <nav aria-label="Admin" className="-ml-3 flex gap-1 text-sm font-medium sm:ml-0">
              <Link href="/admin" className="rounded-full px-3 py-2 hover:bg-canvas">
                Events
              </Link>
              <Link href="/admin/speakers" className="rounded-full px-3 py-2 hover:bg-canvas">
                Speakers
              </Link>
              <Link href="/" className="rounded-full px-3 py-2 text-muted hover:bg-canvas">
                View site
              </Link>
            </nav>
          </div>
          <form action={logoutAction}>
            <button type="submit" className="rounded-full border border-line-strong px-4 py-2 text-sm font-medium hover:border-ink">
              Log out
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">{children}</main>
    </>
  );
}
