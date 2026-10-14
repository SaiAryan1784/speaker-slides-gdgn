import Link from "next/link";
import { ArrowUpRightIcon, MapPinIcon } from "@phosphor-icons/react/dist/ssr";
import SpotlightCard from "@/components/reactbits/SpotlightCard";
import { EVENT_TYPE_STYLES, formatDate } from "@/lib/event-types";
import type { EventCard as EventCardData } from "@/lib/queries";
import { imageUrl } from "@/lib/slides-link";
import { Thumb } from "./Thumb";

export function EventCard({ event, featured = false }: { event: EventCardData; featured?: boolean }) {
  const style = EVENT_TYPE_STYLES[event.type];
  const cover = imageUrl(event.coverImageUrl, 900);
  return (
    <SpotlightCard theme="light" className="!rounded-[var(--radius-card)] !p-0" spotlightColor="#1a73e8">
      <Link
        href={`/events/${event.slug}`}
        className={`group grid h-full ${featured ? "md:grid-cols-[1.1fr_1fr]" : ""}`}
        aria-label={`${event.name}, ${event.talkCount} talks`}
      >
        <Thumb src={cover} type={event.type} label="" ratio={featured ? "aspect-[16/10] md:aspect-auto md:min-h-[260px]" : "aspect-[16/10]"} className="w-full" />
        <div className="flex flex-col gap-3 p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <span className={`rounded-full px-3 py-1 text-xs font-medium ${style.chip}`}>{style.label}</span>
            <span className="text-xs text-muted">{formatDate(event.date)}</span>
          </div>
          <h3 className={`font-semibold leading-tight tracking-tight text-balance ${featured ? "text-2xl sm:text-3xl" : "text-xl"}`}>
            {event.name}
          </h3>
          {(event.city || event.venue) && (
            <p className="flex items-center gap-1.5 text-sm text-muted">
              <MapPinIcon size={16} aria-hidden />
              {[event.venue, event.city].filter(Boolean).join(", ")}
            </p>
          )}
          <div className="mt-auto flex items-center justify-between pt-2 text-sm">
            <span className="font-medium">
              {event.talkCount} {event.talkCount === 1 ? "talk" : "talks"}
            </span>
            <span className="inline-flex items-center gap-1 text-g-blue-ink transition-transform group-hover:translate-x-0.5">
              Browse <ArrowUpRightIcon size={16} weight="bold" aria-hidden />
            </span>
          </div>
        </div>
      </Link>
    </SpotlightCard>
  );
}
