"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDownIcon, ArrowUpIcon, PencilSimpleIcon, PlusIcon, TrashIcon, WarningIcon } from "@phosphor-icons/react";
import { deleteTalk, moveTalk } from "@/app/admin/actions";
import type { SpeakerView, TalkView } from "@/lib/queries";
import { TalkForm } from "./TalkForm";
import { btnPrimary } from "./ui";

export function TalkManager({ eventId, talks, speakers }: { eventId: string; talks: TalkView[]; speakers: SpeakerView[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [editing, setEditing] = useState<TalkView | "new" | null>(null);
  const [warning, setWarning] = useState<string>();
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [known, setKnown] = useState<SpeakerView[]>(speakers);
  const all = [...known, ...speakers.filter((s) => !known.some((k) => k.id === s.id))];

  const run = (fn: () => Promise<void>) =>
    start(async () => {
      await fn();
      router.refresh();
    });

  return (
    <section className="mt-12" aria-labelledby="talks-h">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 id="talks-h" className="text-2xl font-semibold tracking-tight">
          Talks <span className="text-muted">({talks.length})</span>
        </h2>
        {editing === null && (
          <button type="button" className={btnPrimary} onClick={() => setEditing("new")}>
            <PlusIcon size={18} weight="bold" aria-hidden /> Add talk
          </button>
        )}
      </div>

      {warning && (
        <p role="status" className="mb-4 flex items-start gap-2 rounded-2xl bg-g-yellow-tint p-4 text-sm font-medium text-g-yellow-ink">
          <WarningIcon size={18} weight="fill" className="mt-0.5 shrink-0" aria-hidden /> {warning}. The talk was saved.
        </p>
      )}

      {editing !== null && (
        <div className="mb-6">
          <TalkForm
            key={editing === "new" ? "new" : editing.id}
            eventId={eventId}
            talk={editing === "new" ? null : editing}
            speakers={all}
            onSpeakerCreated={(s) => setKnown((k) => [...k, s])}
            onCancel={() => setEditing(null)}
            onDone={(w) => {
              setWarning(w);
              setEditing(null);
              router.refresh();
            }}
          />
        </div>
      )}

      {talks.length === 0 && editing === null ? (
        <div className="rounded-[var(--radius-card)] border border-dashed border-line-strong p-8 text-center text-muted">
          No talks yet. Add the first one with its speaker and slides link.
        </div>
      ) : (
        <ol className="grid grid-cols-[minmax(0,1fr)] gap-3">
          {talks.map((t, i) => (
            <li key={t.id} className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{t.title}</p>
                <p className="truncate text-sm text-muted">{t.speakers.map((s) => s.name).join(" & ") || "No speaker"}</p>
                <p className="mt-1 flex flex-wrap items-center gap-x-3 text-xs">
                  {!t.slidesUrl && <span className="text-muted">No slides yet</span>}
                  {t.slidesUrl && t.slidesPublic === false && (
                    <span className="inline-flex items-center gap-1 font-medium text-g-yellow-ink">
                      <WarningIcon size={14} weight="fill" aria-hidden /> Link looks private
                    </span>
                  )}
                  {t.slidesUrl && t.slidesPublic !== false && <span className="text-g-green">Slides linked</span>}
                </p>
              </div>
              {confirmId === t.id ? (
                <div className="flex flex-wrap items-center gap-2 text-sm" role="alertdialog" aria-label={`Confirm deleting ${t.title}`}>
                  Delete this talk?
                  <button type="button" disabled={pending} onClick={() => run(async () => { await deleteTalk(t.id); setConfirmId(null); })} className="min-h-11 rounded-full border border-g-red/40 px-4 font-medium text-g-red">
                    Yes, delete
                  </button>
                  <button type="button" onClick={() => setConfirmId(null)} className="min-h-11 rounded-full border border-line-strong px-4 font-medium">
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <RowBtn label={`Move ${t.title} up`} disabled={i === 0 || pending} onClick={() => run(() => moveTalk(t.id, "up"))}>
                    <ArrowUpIcon size={18} />
                  </RowBtn>
                  <RowBtn label={`Move ${t.title} down`} disabled={i === talks.length - 1 || pending} onClick={() => run(() => moveTalk(t.id, "down"))}>
                    <ArrowDownIcon size={18} />
                  </RowBtn>
                  <RowBtn label={`Edit ${t.title}`} onClick={() => { setWarning(undefined); setEditing(t); }}>
                    <PencilSimpleIcon size={18} />
                  </RowBtn>
                  <RowBtn label={`Delete ${t.title}`} onClick={() => setConfirmId(t.id)}>
                    <TrashIcon size={18} />
                  </RowBtn>
                </div>
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function RowBtn({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="inline-flex size-11 items-center justify-center rounded-full text-muted transition-colors hover:bg-canvas hover:text-ink disabled:opacity-30"
    >
      {children}
    </button>
  );
}
