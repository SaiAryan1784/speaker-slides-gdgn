"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteEvent, setPublished } from "@/app/admin/actions";
import { btnDanger, btnSecondary } from "./ui";

export function PublishToggle({ id, published, name }: { id: string; published: boolean; name: string }) {
  const router = useRouter();
  const [on, setOn] = useState(published);
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={`${on ? "Unpublish" : "Publish"} ${name}`}
      disabled={pending}
      onClick={() => {
        const next = !on;
        setOn(next);
        start(async () => {
          await setPublished(id, next);
          router.refresh();
        });
      }}
      className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${on ? "bg-g-green" : "bg-line-strong"}`}
    >
      <span className={`absolute left-0.5 top-0.5 size-6 rounded-full bg-white shadow transition-transform ${on ? "translate-x-5" : ""}`} />
    </button>
  );
}

export function DeleteEventButton({ id, name, redirectTo }: { id: string; name: string; redirectTo?: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, start] = useTransition();
  if (!confirming) {
    return (
      <button type="button" className={btnDanger} onClick={() => setConfirming(true)}>
        Delete
      </button>
    );
  }
  return (
    <span className="inline-flex flex-wrap items-center gap-2" role="alertdialog" aria-label={`Confirm deleting ${name}`}>
      <span className="text-sm">Delete event and its talks?</span>
      <button
        type="button"
        className={btnDanger}
        disabled={pending}
        onClick={() =>
          start(async () => {
            await deleteEvent(id);
            if (redirectTo) router.push(redirectTo);
            router.refresh();
          })
        }
      >
        Yes, delete
      </button>
      <button type="button" className={btnSecondary} onClick={() => setConfirming(false)}>
        Cancel
      </button>
    </span>
  );
}
