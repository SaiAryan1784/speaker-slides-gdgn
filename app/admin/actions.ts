"use server";

import { and, asc, count, eq, max, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db, events, speakers, talkSpeakers, talks } from "@/db";
import { login, logout, requireAdmin } from "@/lib/auth";
import { checkThumbnailPublic } from "@/lib/public-check";
import { parseSlidesLink, slugify } from "@/lib/slides-link";
import {
  eventSchema,
  speakerSchema,
  talkSchema,
  toFieldErrors,
  type EventInput,
  type FieldErrors,
  type SpeakerInput,
  type TalkInput,
} from "@/lib/validation";

export type ActionResult<T = undefined> =
  | { ok: true; data: T; warning?: string }
  | { ok: false; errors: FieldErrors };

const fail = (errors: FieldErrors): { ok: false; errors: FieldErrors } => ({ ok: false, errors });
const refresh = () => revalidatePath("/", "layout");

/* ---------- session ---------- */

export async function loginAction(password: string): Promise<{ ok: true } | { ok: false; error: string }> {
  return login(password);
}

export async function logoutAction(): Promise<void> {
  await logout();
  redirect("/admin/login");
}

/* ---------- helpers ---------- */

async function freeSlug(base: string, taken: (s: string) => Promise<boolean>): Promise<string> {
  if (!(await taken(base))) return base;
  for (let i = 2; i < 200; i++) {
    if (!(await taken(`${base}-${i}`))) return `${base}-${i}`;
  }
  return `${base}-${Date.now()}`;
}

/* ---------- events ---------- */

export async function saveEvent(id: string | null, raw: unknown): Promise<ActionResult<{ id: string; slug: string }>> {
  await requireAdmin();
  const parsed = eventSchema.safeParse(raw);
  if (!parsed.success) return fail(toFieldErrors(parsed.error));
  const input: EventInput = parsed.data;
  const slug = input.slug ?? slugify(input.name);

  const clash = async (s: string) => {
    const where = id ? and(eq(events.slug, s), ne(events.id, id)) : eq(events.slug, s);
    return (await db().select({ id: events.id }).from(events).where(where).limit(1)).length > 0;
  };
  if (await clash(slug)) {
    const suggestion = await freeSlug(slug, clash);
    return fail({ slug: `Slug already taken — try "${suggestion}"` });
  }

  const values = {
    slug,
    name: input.name,
    type: input.type,
    date: input.date,
    venue: input.venue ?? null,
    city: input.city ?? null,
    description: input.description ?? null,
    eventUrl: input.eventUrl ?? null,
    coverImageUrl: input.coverImageUrl ?? null,
    published: input.published,
    updatedAt: new Date(),
  };
  let eventId = id;
  if (id) {
    await db().update(events).set(values).where(eq(events.id, id));
  } else {
    const [row] = await db().insert(events).values(values).returning({ id: events.id });
    eventId = row.id;
  }
  refresh();
  return { ok: true, data: { id: eventId!, slug } };
}

export async function setPublished(id: string, published: boolean): Promise<void> {
  await requireAdmin();
  await db().update(events).set({ published, updatedAt: new Date() }).where(eq(events.id, id));
  refresh();
}

export async function deleteEvent(id: string): Promise<void> {
  await requireAdmin();
  await db().delete(events).where(eq(events.id, id));
  refresh();
}

/* ---------- speakers ---------- */

export async function saveSpeaker(
  id: string | null,
  raw: unknown,
): Promise<ActionResult<{ id: string; name: string; designation: string | null }>> {
  await requireAdmin();
  const parsed = speakerSchema.safeParse(raw);
  if (!parsed.success) return fail(toFieldErrors(parsed.error));
  const input: SpeakerInput = parsed.data;
  const values = {
    name: input.name,
    linkedinUrl: input.linkedinUrl ?? null,
    designation: input.designation ?? null,
    photoUrl: input.photoUrl ?? null,
    updatedAt: new Date(),
  };
  let speakerId = id;
  if (id) {
    await db().update(speakers).set(values).where(eq(speakers.id, id));
  } else {
    const [row] = await db().insert(speakers).values(values).returning({ id: speakers.id });
    speakerId = row.id;
  }
  refresh();
  return { ok: true, data: { id: speakerId!, name: values.name, designation: values.designation } };
}

export async function deleteSpeaker(id: string): Promise<ActionResult> {
  await requireAdmin();
  const [{ n }] = await db().select({ n: count() }).from(talkSpeakers).where(eq(talkSpeakers.speakerId, id));
  if (n > 0) return fail({ form: `Speaker is used in ${n} talk${n === 1 ? "" : "s"}` });
  await db().delete(speakers).where(eq(speakers.id, id));
  refresh();
  return { ok: true, data: undefined };
}

/* ---------- talks ---------- */

export async function saveTalk(
  eventId: string,
  talkId: string | null,
  raw: unknown,
): Promise<ActionResult<{ id: string; slug: string }>> {
  await requireAdmin();
  const parsed = talkSchema.safeParse(raw);
  if (!parsed.success) return fail(toFieldErrors(parsed.error));
  const input: TalkInput = parsed.data;

  let slidesFields = {
    slidesUrl: null as string | null,
    slidesKind: null as "drive_file" | "google_slides" | "external" | null,
    slidesFileId: null as string | null,
    slidesPublic: null as boolean | null,
  };
  let warning: string | undefined;
  if (input.slidesUrl) {
    const link = parseSlidesLink(input.slidesUrl);
    if (!link.ok) return fail({ slidesUrl: link.error });
    const isPublic = link.thumbnailUrl ? await checkThumbnailPublic(link.thumbnailUrl) : null;
    slidesFields = { slidesUrl: input.slidesUrl, slidesKind: link.kind, slidesFileId: link.fileId, slidesPublic: isPublic };
    if (isPublic === false) {
      warning = 'Link looks private — set sharing to "Anyone with the link"';
    }
  }

  const clash = async (s: string) => {
    const where = talkId
      ? and(eq(talks.eventId, eventId), eq(talks.slug, s), ne(talks.id, talkId))
      : and(eq(talks.eventId, eventId), eq(talks.slug, s));
    return (await db().select({ id: talks.id }).from(talks).where(where).limit(1)).length > 0;
  };
  let slug: string;
  if (input.slug) {
    if (await clash(input.slug)) {
      return fail({ slug: `Slug already taken — try "${await freeSlug(input.slug, clash)}"` });
    }
    slug = input.slug;
  } else {
    slug = await freeSlug(slugify(input.title), clash);
  }

  const id = talkId ?? crypto.randomUUID();
  const links = input.speakerIds.map((speakerId, position) => ({ talkId: id, speakerId, position }));
  const base = {
    slug,
    title: input.title,
    abstract: input.abstract ?? null,
    tags: input.tags,
    ...slidesFields,
    updatedAt: new Date(),
  };

  if (talkId) {
    await db().batch([
      db().update(talks).set(base).where(eq(talks.id, talkId)),
      db().delete(talkSpeakers).where(eq(talkSpeakers.talkId, talkId)),
      db().insert(talkSpeakers).values(links),
    ]);
  } else {
    const [{ top }] = await db().select({ top: max(talks.position) }).from(talks).where(eq(talks.eventId, eventId));
    await db().batch([
      db().insert(talks).values({ id, eventId, position: (top ?? -1) + 1, ...base }),
      db().insert(talkSpeakers).values(links),
    ]);
  }
  refresh();
  return { ok: true, data: { id, slug }, warning };
}

export async function deleteTalk(id: string): Promise<void> {
  await requireAdmin();
  await db().delete(talks).where(eq(talks.id, id));
  refresh();
}

export async function moveTalk(talkId: string, direction: "up" | "down"): Promise<void> {
  await requireAdmin();
  const [t] = await db().select({ eventId: talks.eventId }).from(talks).where(eq(talks.id, talkId)).limit(1);
  if (!t) return;
  const ordered = await db()
    .select({ id: talks.id })
    .from(talks)
    .where(eq(talks.eventId, t.eventId))
    .orderBy(asc(talks.position), asc(talks.createdAt));
  const i = ordered.findIndex((r) => r.id === talkId);
  const j = direction === "up" ? i - 1 : i + 1;
  if (i === -1 || j < 0 || j >= ordered.length) return;
  [ordered[i], ordered[j]] = [ordered[j], ordered[i]];
  const updates = ordered.map((r, position) => db().update(talks).set({ position }).where(eq(talks.id, r.id)));
  await db().batch(updates as [(typeof updates)[number], ...(typeof updates)[number][]]);
  refresh();
}
