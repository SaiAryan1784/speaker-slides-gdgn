"use client";

import { useState, useTransition } from "react";
import { saveSpeaker } from "@/app/admin/actions";
import type { SpeakerView } from "@/lib/queries";
import type { FieldErrors } from "@/lib/validation";
import { Field, btnPrimary, btnSecondary, inputCls } from "./ui";

export type SavedSpeaker = { id: string; name: string; designation: string | null };

export function SpeakerForm({
  speaker,
  onSaved,
  onCancel,
  compact = false,
}: {
  speaker: SpeakerView | null;
  onSaved: (s: SpeakerView) => void;
  onCancel: () => void;
  compact?: boolean;
}) {
  const [pending, start] = useTransition();
  const [errors, setErrors] = useState<FieldErrors>({});
  const [v, setV] = useState({
    name: speaker?.name ?? "",
    linkedinUrl: speaker?.linkedinUrl ?? "",
    designation: speaker?.designation ?? "",
    photoUrl: speaker?.photoUrl ?? "",
  });
  const set = (k: keyof typeof v, val: string) => setV((s) => ({ ...s, [k]: val }));

  // Not a nested <form>: this component renders inside the talk form.
  const submit = () =>
    start(async () => {
      const r = await saveSpeaker(speaker?.id ?? null, v);
      if (!r.ok) return setErrors(r.errors);
      setErrors({});
      onSaved({
        id: r.data.id,
        name: r.data.name,
        designation: r.data.designation,
        linkedinUrl: v.linkedinUrl.trim() || null,
        photoUrl: v.photoUrl.trim() || null,
      });
    });

  return (
    <div
      className={`grid gap-5 rounded-2xl border border-line bg-canvas p-5 ${compact ? "" : "sm:grid-cols-2"}`}
      onKeyDown={(e) => {
        if (e.key === "Enter" && (e.target as HTMLElement).tagName === "INPUT") {
          e.preventDefault();
          submit();
        }
      }}
    >
      <Field label="Name" required error={errors.name}>
        {(p) => <input {...p} className={inputCls} value={v.name} onChange={(e) => set("name", e.target.value)} />}
      </Field>
      <Field label="Designation" error={errors.designation} help="For example: Senior Engineer, Acme">
        {(p) => <input {...p} className={inputCls} value={v.designation} onChange={(e) => set("designation", e.target.value)} />}
      </Field>
      <Field label="LinkedIn link" error={errors.linkedinUrl}>
        {(p) => <input {...p} type="url" inputMode="url" className={inputCls} value={v.linkedinUrl} onChange={(e) => set("linkedinUrl", e.target.value)} />}
      </Field>
      <Field label="Photo link" error={errors.photoUrl} help="Public image link or a Google Drive image link">
        {(p) => <input {...p} type="url" inputMode="url" className={inputCls} value={v.photoUrl} onChange={(e) => set("photoUrl", e.target.value)} />}
      </Field>
      <div className="flex flex-wrap gap-3 sm:col-span-2">
        <button type="button" disabled={pending} className={btnPrimary} onClick={submit}>
          {pending ? "Saving..." : speaker ? "Save speaker" : "Add speaker"}
        </button>
        <button type="button" className={btnSecondary} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}
