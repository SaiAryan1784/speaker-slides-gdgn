"use client";

import { useState, useTransition } from "react";
import { XIcon } from "@phosphor-icons/react";
import { saveTalk } from "@/app/admin/actions";
import type { SpeakerView, TalkView } from "@/lib/queries";
import { parseSlidesLink } from "@/lib/slides-link";
import type { FieldErrors } from "@/lib/validation";
import { SpeakerPicker } from "./SpeakerPicker";
import { Field, btnPrimary, btnSecondary, inputCls } from "./ui";

const KIND_LABEL = { drive_file: "Google Drive file", google_slides: "Google Slides", external: "External link (opens on its own site)" } as const;

export function TalkForm({
  eventId,
  talk,
  speakers,
  onSpeakerCreated,
  onDone,
  onCancel,
}: {
  eventId: string;
  talk: TalkView | null;
  speakers: SpeakerView[];
  onSpeakerCreated: (s: SpeakerView) => void;
  onDone: (warning?: string) => void;
  onCancel: () => void;
}) {
  const [pending, start] = useTransition();
  const [errors, setErrors] = useState<FieldErrors>({});
  const [title, setTitle] = useState(talk?.title ?? "");
  const [slug, setSlug] = useState(talk?.slug ?? "");
  const [abstract, setAbstract] = useState(talk?.abstract ?? "");
  const [tags, setTags] = useState<string[]>(talk?.tags ?? []);
  const [tagDraft, setTagDraft] = useState("");
  const [slidesUrl, setSlidesUrl] = useState(talk?.slidesUrl ?? "");
  const [speakerIds, setSpeakerIds] = useState<string[]>(talk?.speakers.map((s) => s.id) ?? []);

  const link = slidesUrl.trim() ? parseSlidesLink(slidesUrl) : null;
  const linkError = errors.slidesUrl ?? (link && !link.ok ? link.error : undefined);

  const addTags = (raw: string) => {
    const incoming = raw.split(",").map((t) => t.trim()).filter(Boolean);
    if (incoming.length) setTags((t) => [...new Set([...t, ...incoming])]);
    setTagDraft("");
  };

  return (
    <form
      noValidate
      aria-label={talk ? "Edit talk" : "Add talk"}
      className="grid gap-6 rounded-[var(--radius-card)] border border-g-blue/30 bg-surface p-5 sm:p-8"
      onSubmit={(e) => {
        e.preventDefault();
        if (link && !link.ok) return setErrors({ slidesUrl: link.error });
        start(async () => {
          const pendingTag = tagDraft.trim() ? [...new Set([...tags, ...tagDraft.split(",").map((t) => t.trim()).filter(Boolean)])] : tags;
          const r = await saveTalk(eventId, talk?.id ?? null, { title, slug, abstract, tags: pendingTag, slidesUrl, speakerIds });
          if (!r.ok) return setErrors(r.errors);
          onDone(r.warning);
        });
      }}
    >
      <Field label="Talk title" required error={errors.title}>
        {(p) => <input {...p} className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} />}
      </Field>

      <SpeakerPicker speakers={speakers} selected={speakerIds} onChange={setSpeakerIds} onCreated={onSpeakerCreated} error={errors.speakerIds} />

      <Field
        label="Slides link"
        error={linkError}
        help="Paste the Google Drive or Google Slides share link. Sharing must be set to Anyone with the link."
      >
        {(p) => <input {...p} type="url" inputMode="url" className={inputCls} value={slidesUrl} onChange={(e) => setSlidesUrl(e.target.value)} />}
      </Field>
      {link?.ok && (
        <div className="flex items-center gap-4 rounded-2xl border border-line bg-canvas p-3" role="status">
          {link.thumbnailUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- remote Google thumbnail preview
            <img src={link.thumbnailUrl} alt="" referrerPolicy="no-referrer" className="aspect-video w-32 rounded-lg border border-line bg-surface object-cover" onError={(e) => (e.currentTarget.style.visibility = "hidden")} />
          )}
          <p className="text-sm font-medium">{KIND_LABEL[link.kind]}</p>
        </div>
      )}

      <Field label="Abstract" error={errors.abstract} help="Optional. A few sentences about the talk.">
        {(p) => <textarea {...p} rows={3} className={`${inputCls} h-auto py-3`} value={abstract} onChange={(e) => setAbstract(e.target.value)} />}
      </Field>

      <Field label="Tags" error={errors.tags} help="Press Enter or comma after each tag, for example AI, Web, Cloud">
        {(p) => (
          <div className="flex flex-col gap-2">
            {tags.length > 0 && (
              <ul className="flex flex-wrap gap-2">
                {tags.map((t) => (
                  <li key={t} className="inline-flex items-center gap-1 rounded-full bg-g-blue-tint py-1 pl-3 pr-1 text-sm font-medium text-g-blue-ink">
                    {t}
                    <button type="button" aria-label={`Remove tag ${t}`} onClick={() => setTags(tags.filter((x) => x !== t))} className="inline-flex size-6 items-center justify-center rounded-full hover:bg-white/60">
                      <XIcon size={12} weight="bold" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <input
              {...p}
              className={inputCls}
              value={tagDraft}
              onChange={(e) => (e.target.value.includes(",") ? addTags(e.target.value) : setTagDraft(e.target.value))}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addTags(tagDraft);
                } else if (e.key === "Backspace" && !tagDraft && tags.length) setTags(tags.slice(0, -1));
              }}
              onBlur={() => tagDraft.trim() && addTags(tagDraft)}
            />
          </div>
        )}
      </Field>

      <details className="rounded-xl border border-line px-4 py-3">
        <summary className="cursor-pointer text-sm font-medium">Advanced: URL slug</summary>
        <div className="mt-4">
          <Field label="Talk slug" error={errors.slug} help="Leave blank to generate it from the title">
            {(p) => <input {...p} className={inputCls} value={slug} onChange={(e) => setSlug(e.target.value)} />}
          </Field>
        </div>
      </details>

      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={pending} className={btnPrimary}>
          {pending ? "Saving..." : talk ? "Save talk" : "Add talk"}
        </button>
        <button type="button" onClick={onCancel} className={btnSecondary}>
          Cancel
        </button>
      </div>
    </form>
  );
}
