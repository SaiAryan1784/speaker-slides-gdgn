"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveEvent } from "@/app/admin/actions";
import { EVENT_TYPES } from "@/db/schema";
import { EVENT_TYPE_STYLES } from "@/lib/event-types";
import type { EventView } from "@/lib/queries";
import { slugify } from "@/lib/slides-link";
import type { FieldErrors } from "@/lib/validation";
import { Field, btnPrimary, inputCls } from "./ui";

export function EventForm({ event }: { event: EventView | null }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saved, setSaved] = useState(false);
  const [slugTouched, setSlugTouched] = useState(!!event);
  const [v, setV] = useState({
    name: event?.name ?? "",
    slug: event?.slug ?? "",
    type: event?.type ?? "meetup",
    date: event?.date ?? "",
    venue: event?.venue ?? "",
    city: event?.city ?? "",
    description: event?.description ?? "",
    eventUrl: event?.eventUrl ?? "",
    coverImageUrl: event?.coverImageUrl ?? "",
    published: event?.published ?? false,
  });
  const set = <K extends keyof typeof v>(k: K, val: (typeof v)[K]) => {
    setV((s) => ({ ...s, [k]: val }));
    setSaved(false);
  };

  return (
    <form
      noValidate
      className="grid gap-6 rounded-[var(--radius-card)] border border-line bg-surface p-5 sm:p-8"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await saveEvent(event?.id ?? null, v);
          if (!r.ok) return setErrors(r.errors);
          setErrors({});
          setSaved(true);
          if (!event) router.replace(`/admin/events/${r.data.id}`);
          else router.refresh();
        });
      }}
    >
      <div className="grid gap-6 sm:grid-cols-2">
        <Field label="Event name" required error={errors.name}>
          {(p) => (
            <input
              {...p}
              className={inputCls}
              value={v.name}
              onChange={(e) => {
                set("name", e.target.value);
                if (!slugTouched) set("slug", slugify(e.target.value));
              }}
            />
          )}
        </Field>
        <Field label="URL slug" error={errors.slug} help={`Public address: /events/${v.slug || "..."}`}>
          {(p) => (
            <input
              {...p}
              className={inputCls}
              value={v.slug}
              onChange={(e) => {
                setSlugTouched(true);
                set("slug", e.target.value);
              }}
            />
          )}
        </Field>
        <Field label="Event type" error={errors.type}>
          {(p) => (
            <select {...p} className={inputCls} value={v.type} onChange={(e) => set("type", e.target.value as typeof v.type)}>
              {EVENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {EVENT_TYPE_STYLES[t].label}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field label="Date" required error={errors.date}>
          {(p) => <input {...p} type="date" className={inputCls} value={v.date} onChange={(e) => set("date", e.target.value)} />}
        </Field>
        <Field label="Venue" error={errors.venue}>
          {(p) => <input {...p} className={inputCls} value={v.venue} onChange={(e) => set("venue", e.target.value)} />}
        </Field>
        <Field label="City" error={errors.city}>
          {(p) => <input {...p} className={inputCls} value={v.city} onChange={(e) => set("city", e.target.value)} />}
        </Field>
      </div>

      <Field label="Description" error={errors.description}>
        {(p) => <textarea {...p} rows={3} className={`${inputCls} h-auto py-3`} value={v.description} onChange={(e) => set("description", e.target.value)} />}
      </Field>

      <div className="grid gap-6 sm:grid-cols-2">
        <Field label="Event page link" error={errors.eventUrl} help="For example the gdg.community.dev page">
          {(p) => <input {...p} type="url" inputMode="url" className={inputCls} value={v.eventUrl} onChange={(e) => set("eventUrl", e.target.value)} />}
        </Field>
        <Field label="Cover image link" error={errors.coverImageUrl} help="A public image link or a Google Drive image link">
          {(p) => <input {...p} type="url" inputMode="url" className={inputCls} value={v.coverImageUrl} onChange={(e) => set("coverImageUrl", e.target.value)} />}
        </Field>
      </div>

      <label className="flex items-center gap-3 text-sm font-medium">
        <input type="checkbox" className="size-5 accent-[var(--color-g-blue)]" checked={v.published} onChange={(e) => set("published", e.target.checked)} />
        Published (visible on the public site)
      </label>

      <div className="flex flex-wrap items-center gap-4">
        <button type="submit" disabled={pending} className={btnPrimary}>
          {pending ? "Saving..." : event ? "Save event" : "Create event"}
        </button>
        {saved && (
          <p role="status" className="text-sm font-medium text-g-green">
            Saved
          </p>
        )}
      </div>
    </form>
  );
}
