import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/admin/LoginForm";
import { Logo } from "@/components/site/Logo";
import { isAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: "Organizer sign in", robots: { index: false } };

export default async function LoginPage() {
  if (await isAdmin()) redirect("/admin");
  return (
    <div className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-8 px-6">
      <Logo />
      <div>
        <h1 className="text-3xl font-semibold tracking-tighter">Organizer sign in</h1>
        <p className="mt-2 text-sm text-muted">Add events, speakers and slide links.</p>
      </div>
      <LoginForm />
    </div>
  );
}
