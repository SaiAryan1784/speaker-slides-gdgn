"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PencilSimpleIcon, TrashIcon } from "@phosphor-icons/react";
import { deleteSpeaker } from "@/app/admin/actions";
import { Avatar } from "@/components/site/Avatar";
import type { SpeakerRow } from "@/lib/queries";
import { SpeakerForm } from "./SpeakerForm";

export function SpeakerList({ speakers }: { speakers: SpeakerRow[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [editing, setEditing] = useState<string | null>(null);
  const [error, setError] = useState<{ id: string; msg: string } | null>(null);

  if (speakers.length === 0) {
    return (
      <div className="rounded-[var(--radius-card)] border border-dashed border-line-strong p-10 text-center text-muted">
        No speakers yet. Add them while creating a talk.
      </div>
    );
  }

  return (
    <ul className="grid grid-cols-[minmax(0,1fr)] gap-3">
      {speakers.map((s) =>
        editing === s.id ? (
          <li key={s.id}>
            <SpeakerForm
              speaker={s}
              onCancel={() => setEditing(null)}
              onSaved={() => {
                setEditing(null);
                router.refresh();
              }}
            />
          </li>
        ) : (
          <li key={s.id} className="rounded-2xl border border-line bg-surface p-4">
            <div className="flex items-center gap-4">
              <Avatar name={s.name} photoUrl={s.photoUrl} size={44} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{s.name}</p>
                <p className="truncate text-sm text-muted">
                  {s.designation || "No designation"} &middot; {s.talkCount} {s.talkCount === 1 ? "talk" : "talks"}
                </p>
              </div>
              <button type="button" aria-label={`Edit ${s.name}`} onClick={() => setEditing(s.id)} className="inline-flex size-11 items-center justify-center rounded-full text-muted hover:bg-canvas hover:text-ink">
                <PencilSimpleIcon size={18} />
              </button>
              <button
                type="button"
                aria-label={`Delete ${s.name}`}
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    const r = await deleteSpeaker(s.id);
                    setError(r.ok ? null : { id: s.id, msg: r.errors.form ?? "Could not delete" });
                    router.refresh();
                  })
                }
                className="inline-flex size-11 items-center justify-center rounded-full text-muted hover:bg-g-red-tint hover:text-g-red"
              >
                <TrashIcon size={18} />
              </button>
            </div>
            {error?.id === s.id && (
              <p role="alert" className="mt-3 text-sm font-medium text-g-red">
                {error.msg}
              </p>
            )}
          </li>
        ),
      )}
    </ul>
  );
}
