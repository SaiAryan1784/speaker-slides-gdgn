import Link from "next/link";
import { ArrowUpRightIcon, LinkedinLogoIcon } from "@phosphor-icons/react/dist/ssr";
import { EVENT_TYPE_STYLES, formatDate } from "@/lib/event-types";
import type { TalkRowData } from "@/lib/row";
import { Avatar } from "./Avatar";
import { Thumb } from "./Thumb";

/** Speaker (LinkedIn), designation, talk title (linked to slides). */
export function TalkRow({ talk, showEvent = false }: { talk: TalkRowData; showEvent?: boolean }) {
  const typeStyle = EVENT_TYPE_STYLES[talk.event.type];
  return (
    <article className="group relative grid gap-4 rounded-[var(--radius-card)] border border-line bg-surface p-4 transition-[border-color,box-shadow] duration-300 hover:border-line-strong hover:shadow-[0_12px_32px_-20px_rgba(20,24,31,0.25)] sm:p-5 md:grid-cols-[1fr_200px] md:gap-6">
      <div className="min-w-0 space-y-3">
        {showEvent && (
          <Link
            href={`/events/${talk.event.slug}`}
            className={`relative z-10 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${typeStyle.chip}`}
          >
            {talk.event.name}
            <span className="opacity-70">{formatDate(talk.event.date, { month: "short", year: "numeric" })}</span>
          </Link>
        )}

        <ul className="flex flex-col gap-2">
          {talk.speakers.map((s) => (
            <li key={s.name} className="flex items-center gap-3">
              <Avatar name={s.name} photoUrl={s.photoUrl} size={36} />
              <div className="min-w-0 leading-tight">
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-sm font-semibold">{s.name}</span>
                  {s.linkedinUrl && (
                    <a
                      href={s.linkedinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`${s.name} on LinkedIn`}
                      className="relative z-10 inline-flex size-6 items-center justify-center rounded-full text-g-blue transition-colors hover:bg-g-blue-tint"
                    >
                      <LinkedinLogoIcon size={16} weight="fill" aria-hidden />
                    </a>
                  )}
                </div>
                {s.designation && <p className="truncate text-xs text-muted">{s.designation}</p>}
              </div>
            </li>
          ))}
        </ul>

        <h3 className="text-lg font-semibold leading-snug tracking-tight text-balance sm:text-xl">
          {talk.href ? (
            <Link href={talk.href} className="after:absolute after:inset-0 after:content-[''] hover:text-g-blue-ink">
              {talk.title}
            </Link>
          ) : (
            talk.title
          )}
        </h3>

        {talk.tags.length > 0 && (
          <ul className="flex flex-wrap gap-1.5">
            {talk.tags.map((t) => (
              <li key={t} className="rounded-full bg-canvas px-2.5 py-1 text-xs font-medium text-muted">
                {t}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-col gap-3 md:items-stretch">
        {talk.href ? (
          <>
            <Thumb
              src={talk.thumbnailUrl}
              type={talk.event.type}
              label={`First slide of ${talk.title}`}
              className="w-full rounded-xl border border-line"
            />
            <span className="inline-flex items-center justify-center gap-1.5 rounded-full bg-g-blue px-4 py-2 text-sm font-medium text-white transition-transform group-hover:-translate-y-px group-active:scale-[0.98]">
              View slides <ArrowUpRightIcon size={16} weight="bold" aria-hidden />
            </span>
          </>
        ) : (
          <span className="inline-flex items-center justify-center rounded-full border border-dashed border-line-strong px-4 py-2 text-sm text-muted">
            Slides coming soon
          </span>
        )}
      </div>
    </article>
  );
}
