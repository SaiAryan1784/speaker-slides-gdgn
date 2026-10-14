"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { loginAction } from "@/app/admin/actions";
import { Field, btnPrimary, inputCls } from "./ui";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        const password = String(new FormData(e.currentTarget).get("password") ?? "");
        start(async () => {
          const r = await loginAction(password);
          if (r.ok) {
            router.replace("/admin");
            router.refresh();
          } else setError(r.error);
        });
      }}
    >
      <Field label="Organizer password" error={error}>
        {(p) => <input {...p} name="password" type="password" autoComplete="current-password" required className={inputCls} />}
      </Field>
      <button type="submit" disabled={pending} className={btnPrimary}>
        {pending ? "Checking..." : "Sign in"}
      </button>
    </form>
  );
}
