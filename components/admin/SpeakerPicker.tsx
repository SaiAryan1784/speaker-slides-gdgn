"use client";

import { useState } from "react";
import { ArrowDownIcon, ArrowUpIcon, PlusIcon, XIcon } from "@phosphor-icons/react";
import type { SpeakerView } from "@/lib/queries";
import { SpeakerForm } from "./SpeakerForm";
import { btnSecondary, inputCls } from "./ui";

export function SpeakerPicker({
  speakers,
  selected,
  onChange,
  onCreated,
  error,
}: {
  speakers: SpeakerView[];
  selected: string[];
  onChange: (ids: string[]) => void;
  onCreated: (s: SpeakerView) => void;
  error?: string;
}) {
  const [q, setQ] = useState("");
  const [creating, setCreating] = useState(false);
  const byId = new Map(speakers.map((s) => [s.id, s]));
  const matches = speakers
    .filter((s) => !selected.includes(s.id) && s.name.toLowerCase().includes(q.trim().toLowerCase()))
    .slice(0, 6);

  const move = (i: number, d: -1 | 1) => {
    const next = [...selected];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    onChange(next);
  };

  return (
    <fieldset className="grid gap-3">
      <legend className="mb-2 text-sm font-medium">
        Speakers <span className="text-g-red">*</span>
      </legend>

      {selected.length > 0 && (
        <ol className="grid gap-2" aria-label="Selected speakers, in display order">
          {selected.map((id, i) => {
            const s = byId.get(id);
            if (!s) return null;
            return (
              <li key={id} className="flex items-center gap-2 rounded-xl border border-line bg-surface py-1.5 pl-4 pr-1.5">
                <span className="min-w-0 flex-1 truncate text-sm">
                  <span className="font-medium">{s.name}</span>
                  {s.designation && <span className="text-muted">, {s.designation}</span>}
                </span>
                <IconBtn label={`Move ${s.name} up`} disabled={i === 0} onClick={() => move(i, -1)}>
                  <ArrowUpIcon size={16} />
                </IconBtn>
                <IconBtn label={`Move ${s.name} down`} disabled={i === selected.length - 1} onClick={() => move(i, 1)}>
                  <ArrowDownIcon size={16} />
                </IconBtn>
                <IconBtn label={`Remove ${s.name}`} onClick={() => onChange(selected.filter((x) => x !== id))}>
                  <XIcon size={16} />
                </IconBtn>
              </li>
            );
          })}
        </ol>
      )}

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Type to find an existing speaker"
        aria-label="Find an existing speaker"
        className={inputCls}
      />
      {matches.length > 0 && (
        <ul className="grid gap-1" aria-label="Matching speakers">
          {matches.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => {
                  onChange([...selected, s.id]);
                  setQ("");
                }}
                className="flex w-full items-center justify-between gap-3 rounded-xl px-4 py-2.5 text-left text-sm hover:bg-canvas"
              >
                <span>
                  <span className="font-medium">{s.name}</span>
                  {s.designation && <span className="text-muted">, {s.designation}</span>}
                </span>
                <PlusIcon size={16} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
      {q.trim() && matches.length === 0 && <p className="text-sm text-muted">No existing speaker matches. Add a new one below.</p>}

      {creating ? (
        <SpeakerForm
          speaker={null}
          compact
          onCancel={() => setCreating(false)}
          onSaved={(s) => {
            onCreated(s);
            onChange([...selected, s.id]);
            setCreating(false);
          }}
        />
      ) : (
        <button type="button" onClick={() => setCreating(true)} className={`${btnSecondary} justify-self-start`}>
          <PlusIcon size={16} weight="bold" aria-hidden /> New speaker
        </button>
      )}
      {error && (
        <p role="alert" className="text-sm text-g-red">
          {error}
        </p>
      )}
    </fieldset>
  );
}

function IconBtn({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="inline-flex size-10 items-center justify-center rounded-full text-muted hover:bg-canvas hover:text-ink disabled:opacity-30"
    >
      {children}
    </button>
  );
}
