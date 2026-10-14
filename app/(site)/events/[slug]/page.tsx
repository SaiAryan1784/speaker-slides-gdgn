import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon, ArrowUpRightIcon, CalendarBlankIcon, MapPinIcon } from "@phosphor-icons/react/dist/ssr";
import { Reveal } from "@/components/site/Reveal";
import { TalkRow } from "@/components/site/TalkRow";
import { Thumb } from "@/components/site/Thumb";
import { EVENT_TYPE_STYLES, formatDate } from "@/lib/event-types";
import { getPublishedEvent } from "@/lib/queries";
import { rowFromTalk } from "@/lib/row";
import { imageUrl } from "@/lib/slides-link";

export const revalidate = 300;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const found = await getPublishedEvent((await params).slug);
  if (!found) return { title: "Event not found" };
  return {
    title: found.event.name,
    description: found.event.description ?? `Talks and slides from ${found.event.name}.`,
  };
}

export default async function EventPage({ params }: Props) {
  const found = await getPublishedEvent((await params).slug);
  if (!found) notFound();
  const { event, talks } = found;
  const style = EVENT_TYPE_STYLES[event.type];
  const cover = imageUrl(event.coverImageUrl, 1200);

  return (
    <>
      <Link href="/" className="mt-8 inline-flex items-center gap-1.5 rounded-full py-2 text-sm font-medium text-muted hover:text-ink">
        <ArrowLeftIcon size={16} aria-hidden /> All events
      </Link>

      <header className="mt-4 grid gap-8 md:grid-cols-[1.2fr_1fr] md:items-center">
        <div>
          <span className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${style.chip}`}>{style.label}</span>
          <h1 className="mt-4 text-4xl font-semibold leading-[1.05] tracking-tighter text-balance sm:text-5xl">{event.name}</h1>
          <ul className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted">
            <li className="inline-flex items-center gap-1.5">
              <CalendarBlankIcon size={16} aria-hidden /> {formatDate(event.date, { day: "numeric", month: "long", year: "numeric" })}
            </li>
            {(event.venue || event.city) && (
              <li className="inline-flex items-center gap-1.5">
                <MapPinIcon size={16} aria-hidden /> {[event.venue, event.city].filter(Boolean).join(", ")}
              </li>
            )}
          </ul>
          {event.description && <p className="mt-5 max-w-[60ch] leading-relaxed text-muted">{event.description}</p>}
          {event.eventUrl && (
            <a
              href={event.eventUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex items-center gap-1.5 rounded-full border border-line-strong bg-surface px-5 py-2.5 text-sm font-medium transition-colors hover:border-ink"
            >
              Event page <ArrowUpRightIcon size={16} weight="bold" aria-hidden />
            </a>
          )}
        </div>
        <Thumb src={cover} type={event.type} label="" ratio="aspect-[16/10]" className="w-full rounded-[var(--radius-card)] border border-line" />
      </header>

      <section aria-labelledby="talks" className="mt-14">
        <h2 id="talks" className="mb-6 text-2xl font-semibold tracking-tight">
          {talks.length} {talks.length === 1 ? "talk" : "talks"}
        </h2>
        {talks.length === 0 ? (
          <div className="rounded-[var(--radius-card)] border border-dashed border-line-strong p-10 text-muted">
            Talks for this event will appear here soon.
          </div>
        ) : (
          <ul className="grid gap-4">
            {talks.map((t, i) => (
              <Reveal as="li" key={t.id} delay={Math.min(i, 5) * 0.05}>
                <TalkRow talk={rowFromTalk(t, event)} />
              </Reveal>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
