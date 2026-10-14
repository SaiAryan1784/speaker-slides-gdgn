import type { EventType } from "@/db/schema";
import { driveThumbnail } from "./slides-link";
import type { EventView, SearchDoc, TalkView } from "./queries";

/** One shape for the talk list on event pages and in search results. */
export type TalkRowData = {
  id: string;
  title: string;
  tags: string[];
  href: string | null;
  thumbnailUrl: string | null;
  speakers: { name: string; designation: string | null; linkedinUrl: string | null; photoUrl: string | null }[];
  event: { slug: string; name: string; type: EventType; date: string };
};

const thumb = (fileId: string | null) => (fileId ? driveThumbnail(fileId, 480) : null);

export function rowFromTalk(t: TalkView, e: Pick<EventView, "slug" | "name" | "type" | "date">): TalkRowData {
  return {
    id: t.id,
    title: t.title,
    tags: t.tags,
    href: t.slidesUrl ? `/events/${e.slug}/${t.slug}` : null,
    thumbnailUrl: thumb(t.slidesFileId),
    speakers: t.speakers,
    event: { slug: e.slug, name: e.name, type: e.type, date: e.date },
  };
}

export function rowFromDoc(d: SearchDoc): TalkRowData {
  return {
    id: d.id,
    title: d.title,
    tags: d.tags,
    href: d.hasSlides ? `/events/${d.event.slug}/${d.slug}` : null,
    thumbnailUrl: thumb(d.slidesFileId),
    speakers: d.speakers.map((s) => ({ ...s, designation: s.designation || null })),
    event: d.event,
  };
}
