import { and, asc, count, desc, eq, inArray, sql } from "drizzle-orm";
import { db, events, speakers, talkSpeakers, talks, type EventType } from "@/db";

export type SpeakerView = {
  id: string;
  name: string;
  linkedinUrl: string | null;
  designation: string | null;
  photoUrl: string | null;
};

export type EventView = {
  id: string;
  slug: string;
  name: string;
  type: EventType;
  date: string;
  venue: string | null;
  city: string | null;
  description: string | null;
  eventUrl: string | null;
  coverImageUrl: string | null;
  published: boolean;
};

export type TalkView = {
  id: string;
  eventId: string;
  slug: string;
  title: string;
  abstract: string | null;
  tags: string[];
  slidesUrl: string | null;
  slidesKind: "drive_file" | "google_slides" | "external" | null;
  slidesFileId: string | null;
  slidesPublic: boolean | null;
  position: number;
  speakers: SpeakerView[];
};

const eventCols = {
  id: events.id,
  slug: events.slug,
  name: events.name,
  type: events.type,
  date: events.date,
  venue: events.venue,
  city: events.city,
  description: events.description,
  eventUrl: events.eventUrl,
  coverImageUrl: events.coverImageUrl,
  published: events.published,
};

const speakerCols = {
  id: speakers.id,
  name: speakers.name,
  linkedinUrl: speakers.linkedinUrl,
  designation: speakers.designation,
  photoUrl: speakers.photoUrl,
};

async function attachSpeakers(rows: Omit<TalkView, "speakers">[]): Promise<TalkView[]> {
  if (rows.length === 0) return [];
  const links = await db()
    .select({ talkId: talkSpeakers.talkId, position: talkSpeakers.position, ...speakerCols })
    .from(talkSpeakers)
    .innerJoin(speakers, eq(speakers.id, talkSpeakers.speakerId))
    .where(inArray(talkSpeakers.talkId, rows.map((r) => r.id)))
    .orderBy(asc(talkSpeakers.position));
  const byTalk = new Map<string, SpeakerView[]>();
  for (const { talkId, position: _p, ...s } of links) {
    byTalk.set(talkId, [...(byTalk.get(talkId) ?? []), s]);
  }
  return rows.map((r) => ({ ...r, speakers: byTalk.get(r.id) ?? [] }));
}

const talkCols = {
  id: talks.id,
  eventId: talks.eventId,
  slug: talks.slug,
  title: talks.title,
  abstract: talks.abstract,
  tags: talks.tags,
  slidesUrl: talks.slidesUrl,
  slidesKind: talks.slidesKind,
  slidesFileId: talks.slidesFileId,
  slidesPublic: talks.slidesPublic,
  position: talks.position,
};

export async function listTalksForEvent(eventId: string): Promise<TalkView[]> {
  const rows = await db().select(talkCols).from(talks).where(eq(talks.eventId, eventId)).orderBy(asc(talks.position), asc(talks.createdAt));
  return attachSpeakers(rows);
}

/* ---------- public ---------- */

export type EventCard = EventView & { talkCount: number };

export async function listPublishedEvents(): Promise<EventCard[]> {
  const rows = await db()
    .select({ ...eventCols, talkCount: count(talks.id) })
    .from(events)
    .leftJoin(talks, eq(talks.eventId, events.id))
    .where(eq(events.published, true))
    .groupBy(events.id)
    .orderBy(desc(events.date));
  return rows;
}

export async function getPublishedEvent(slug: string): Promise<{ event: EventView; talks: TalkView[] } | null> {
  const [event] = await db().select(eventCols).from(events).where(and(eq(events.slug, slug), eq(events.published, true))).limit(1);
  if (!event) return null;
  return { event, talks: await listTalksForEvent(event.id) };
}

export async function getPublishedTalk(eventSlug: string, talkSlug: string) {
  const found = await getPublishedEvent(eventSlug);
  if (!found) return null;
  const i = found.talks.findIndex((t) => t.slug === talkSlug);
  if (i === -1) return null;
  return {
    event: found.event,
    talk: found.talks[i],
    prev: found.talks[i - 1] ?? null,
    next: found.talks[i + 1] ?? null,
  };
}

export type SearchDoc = {
  id: string;
  title: string;
  abstract: string;
  tags: string[];
  slug: string;
  hasSlides: boolean;
  slidesKind: TalkView["slidesKind"];
  slidesFileId: string | null;
  speakers: { name: string; designation: string; linkedinUrl: string | null; photoUrl: string | null }[];
  event: { slug: string; name: string; type: EventType; date: string };
};

/** Everything the home-page search needs; published events only (AC-34). */
export async function getSearchIndex(): Promise<SearchDoc[]> {
  const pub = await db().select({ id: events.id, slug: events.slug, name: events.name, type: events.type, date: events.date }).from(events).where(eq(events.published, true));
  if (pub.length === 0) return [];
  const byId = new Map(pub.map((e) => [e.id, e]));
  const rows = await db().select(talkCols).from(talks).where(inArray(talks.eventId, pub.map((e) => e.id))).orderBy(asc(talks.position));
  const withSpeakers = await attachSpeakers(rows);
  return withSpeakers
    .map((t) => {
      const e = byId.get(t.eventId)!;
      return {
        id: t.id,
        title: t.title,
        abstract: t.abstract ?? "",
        tags: t.tags,
        slug: t.slug,
        hasSlides: !!t.slidesUrl,
        slidesKind: t.slidesKind,
        slidesFileId: t.slidesFileId,
        speakers: t.speakers.map((s) => ({ name: s.name, designation: s.designation ?? "", linkedinUrl: s.linkedinUrl, photoUrl: s.photoUrl })),
        event: { slug: e.slug, name: e.name, type: e.type, date: e.date },
      } satisfies SearchDoc;
    })
    .sort((a, b) => b.event.date.localeCompare(a.event.date));
}

/* ---------- admin ---------- */

export type AdminEventRow = EventView & { talkCount: number; warningCount: number };

export async function listAllEvents(): Promise<AdminEventRow[]> {
  return db()
    .select({
      ...eventCols,
      talkCount: count(talks.id),
      warningCount: sql<number>`count(*) filter (where ${talks.slidesPublic} = false)`.mapWith(Number),
    })
    .from(events)
    .leftJoin(talks, eq(talks.eventId, events.id))
    .groupBy(events.id)
    .orderBy(desc(events.date));
}

export async function getEventForAdmin(id: string): Promise<{ event: EventView; talks: TalkView[] } | null> {
  const [event] = await db().select(eventCols).from(events).where(eq(events.id, id)).limit(1);
  if (!event) return null;
  return { event, talks: await listTalksForEvent(id) };
}

export async function getTalkForAdmin(id: string): Promise<TalkView | null> {
  const [row] = await db().select(talkCols).from(talks).where(eq(talks.id, id)).limit(1);
  if (!row) return null;
  return (await attachSpeakers([row]))[0];
}

export type SpeakerRow = SpeakerView & { talkCount: number };

export async function listSpeakers(): Promise<SpeakerRow[]> {
  return db()
    .select({ ...speakerCols, talkCount: count(talkSpeakers.talkId) })
    .from(speakers)
    .leftJoin(talkSpeakers, eq(talkSpeakers.speakerId, speakers.id))
    .groupBy(speakers.id)
    .orderBy(asc(speakers.name));
}

export async function getSpeaker(id: string): Promise<SpeakerRow | null> {
  return (await listSpeakers()).find((s) => s.id === id) ?? null;
}
