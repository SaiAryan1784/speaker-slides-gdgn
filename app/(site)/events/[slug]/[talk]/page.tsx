import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon, ArrowRightIcon, LinkedinLogoIcon } from "@phosphor-icons/react/dist/ssr";
import { Avatar } from "@/components/site/Avatar";
import { SlideViewer } from "@/components/site/SlideViewer";
import { EVENT_TYPE_STYLES } from "@/lib/event-types";
import { getPublishedTalk } from "@/lib/queries";
import { parseSlidesLink } from "@/lib/slides-link";

export const revalidate = 300;

type Props = { params: Promise<{ slug: string; talk: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, talk } = await params;
  const found = await getPublishedTalk(slug, talk);
  if (!found) return { title: "Talk not found" };
  const names = found.talk.speakers.map((s) => s.name).join(" & ");
  return { title: found.talk.title, description: `${names} at ${found.event.name}. ${found.talk.abstract ?? ""}`.trim() };
}

export default async function TalkPage({ params }: Props) {
  const { slug, talk: talkSlug } = await params;
  const found = await getPublishedTalk(slug, talkSlug);
  if (!found || !found.talk.slidesUrl) notFound();
  const { event, talk, prev, next } = found;
  const link = parseSlidesLink(talk.slidesUrl!);
  if (!link.ok) notFound();
  const style = EVENT_TYPE_STYLES[event.type];

  return (
    <>
      <Link href={`/events/${event.slug}`} className="mt-8 inline-flex items-center gap-1.5 rounded-full py-2 text-sm font-medium text-muted hover:text-ink">
        <ArrowLeftIcon size={16} aria-hidden /> {event.name}
      </Link>

      <div className="mt-4 grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div>
          <h1 className="mb-6 text-3xl font-semibold leading-tight tracking-tighter text-balance sm:text-4xl">{talk.title}</h1>
          <SlideViewer
            title={talk.title}
            kind={link.kind}
            embedUrl={link.embedUrl}
            downloadUrl={link.downloadUrl}
            openUrl={talk.slidesUrl!}
          />
          {talk.abstract && (
            <section className="mt-10" aria-labelledby="about">
              <h2 id="about" className="text-lg font-semibold">
                About this talk
              </h2>
              <p className="mt-3 max-w-[65ch] whitespace-pre-line leading-relaxed text-muted">{talk.abstract}</p>
            </section>
          )}
        </div>

        <aside className="space-y-8 lg:pt-[3.75rem]">
          <section aria-labelledby="speakers">
            <h2 id="speakers" className="mb-4 text-sm font-medium text-muted">
              {talk.speakers.length > 1 ? "Speakers" : "Speaker"}
            </h2>
            <ul className="space-y-4">
              {talk.speakers.map((s) => (
                <li key={s.id} className="flex items-center gap-3">
                  <Avatar name={s.name} photoUrl={s.photoUrl} size={48} />
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 font-semibold">
                      {s.name}
                      {s.linkedinUrl && (
                        <a
                          href={s.linkedinUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`${s.name} on LinkedIn`}
                          className="inline-flex size-7 items-center justify-center rounded-full text-g-blue hover:bg-g-blue-tint"
                        >
                          <LinkedinLogoIcon size={18} weight="fill" aria-hidden />
                        </a>
                      )}
                    </p>
                    {s.designation && <p className="text-sm text-muted">{s.designation}</p>}
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-3 py-1 text-xs font-medium ${style.chip}`}>{style.label}</span>
            {talk.tags.map((t) => (
              <span key={t} className="rounded-full bg-surface px-3 py-1 text-xs font-medium text-muted ring-1 ring-line">
                {t}
              </span>
            ))}
          </div>

          <nav aria-label="Other talks at this event" className="grid gap-2">
            {prev ? (
              <PagerLink href={`/events/${event.slug}/${prev.slug}`} label="Previous talk" title={prev.title} disabled={!prev.slidesUrl} direction="prev" />
            ) : null}
            {next ? (
              <PagerLink href={`/events/${event.slug}/${next.slug}`} label="Next talk" title={next.title} disabled={!next.slidesUrl} direction="next" />
            ) : null}
          </nav>
        </aside>
      </div>
    </>
  );
}

function PagerLink({ href, label, title, disabled, direction }: { href: string; label: string; title: string; disabled: boolean; direction: "prev" | "next" }) {
  const body = (
    <>
      <span className="flex items-center gap-1.5 text-xs font-medium text-muted">
        {direction === "prev" && <ArrowLeftIcon size={14} aria-hidden />}
        {label}
        {direction === "next" && <ArrowRightIcon size={14} aria-hidden />}
      </span>
      <span className="line-clamp-2 text-sm font-medium">{title}</span>
    </>
  );
  const cls = "flex flex-col gap-1 rounded-2xl border border-line bg-surface p-4";
  return disabled ? (
    <div className={`${cls} opacity-60`} aria-label={`${label}: ${title}, slides coming soon`}>
      {body}
    </div>
  ) : (
    <Link href={href} className={`${cls} transition-colors hover:border-line-strong`}>
      {body}
    </Link>
  );
}
