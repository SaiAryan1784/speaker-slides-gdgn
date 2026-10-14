"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Fuse from "fuse.js";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { MagnifyingGlassIcon, XIcon } from "@phosphor-icons/react";
import BlurText from "@/components/reactbits/BlurText";
import { EVENT_TYPE_STYLES } from "@/lib/event-types";
import type { EventCard as EventCardData, SearchDoc } from "@/lib/queries";
import { rowFromDoc } from "@/lib/row";
import { Reveal } from "./Reveal";
import { Thumb } from "./Thumb";
import { TalkRow } from "./TalkRow";
import { EventCard } from "./EventCard";
import type { EventType } from "@/db/schema";
import { driveThumbnail } from "@/lib/slides-link";

export function HomeClient({ events, docs }: { events: EventCardData[]; docs: SearchDoc[] }) {
  const params = useSearchParams();
  const reduce = useReducedMotion();
  const inputRef = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState(params.get("q") ?? "");
  const [type, setType] = useState<string | null>(params.get("type"));
  const [tag, setTag] = useState<string | null>(params.get("tag"));

  const fuse = useMemo(
    () =>
      new Fuse(docs, {
        keys: [
          { name: "title", weight: 3 },
          { name: "speakers.name", weight: 3 },
          { name: "tags", weight: 2 },
          { name: "event.name", weight: 1 },
          { name: "speakers.designation", weight: 0.7 },
          { name: "abstract", weight: 0.5 },
        ],
        threshold: 0.34,
        ignoreLocation: true,
        minMatchCharLength: 2,
      }),
    [docs],
  );

  // Mirror state into the URL so results are shareable and survive reload (AC-33).
  useEffect(() => {
    const next = new URLSearchParams();
    if (q.trim()) next.set("q", q.trim());
    if (type) next.set("type", type);
    if (tag) next.set("tag", tag);
    const qs = next.toString();
    window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
  }, [q, type, tag]);

  // "/" focuses search (AC-37).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (e.key === "/" && el?.tagName !== "INPUT" && el?.tagName !== "TEXTAREA" && !el?.isContentEditable) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const searching = q.trim().length > 0 || !!type || !!tag;
  const base = q.trim() ? fuse.search(q.trim()).map((r) => r.item) : docs;
  const results = base.filter((d) => (!type || d.event.type === type) && (!tag || d.tags.includes(tag)));

  const types = useMemo(() => [...new Set(docs.map((d) => d.event.type))] as EventType[], [docs]);
  const tags = useMemo(() => [...new Set(docs.flatMap((d) => d.tags))].sort((a, b) => a.localeCompare(b)), [docs]);
  const recent = docs.filter((d) => d.slidesFileId).slice(0, 3);

  const clear = () => {
    setQ("");
    setType(null);
    setTag(null);
    inputRef.current?.focus();
  };

  return (
    <>
      <section className="grid items-center gap-10 pb-10 pt-12 sm:pt-16 lg:grid-cols-[1.25fr_1fr] lg:pb-14 lg:pt-20">
        <div>
          <BlurText
            as="h1"
            text="Every talk and every deck from GDG Noida."
            animateBy="words"
            delay={90}
            className="justify-start text-4xl font-semibold leading-[1.05] tracking-tighter sm:text-5xl lg:text-6xl"
          />
          <p className="mt-5 max-w-[46ch] text-base leading-relaxed text-muted sm:text-lg">
            Find a speaker or a topic, read the slides right here, or download them.
          </p>

          <form role="search" onSubmit={(e) => e.preventDefault()} className="mt-8 max-w-xl">
            <label htmlFor="q" className="sr-only">
              Search talks, speakers and topics
            </label>
            <div className="relative">
              <MagnifyingGlassIcon size={20} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" aria-hidden />
              <input
                ref={inputRef}
                id="q"
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search a speaker, topic or event"
                autoComplete="off"
                className="h-14 w-full rounded-full border border-line-strong bg-surface pl-12 pr-24 text-base shadow-[0_1px_2px_rgba(20,24,31,0.04)] outline-none transition-[border-color,box-shadow] placeholder:text-muted focus:border-g-blue focus:shadow-[0_0_0_4px_var(--color-g-blue-tint)]"
              />
              {q ? (
                <button
                  type="button"
                  onClick={clear}
                  aria-label="Clear search"
                  className="absolute right-3 top-1/2 inline-flex size-9 -translate-y-1/2 items-center justify-center rounded-full text-muted hover:bg-canvas hover:text-ink"
                >
                  <XIcon size={16} weight="bold" />
                </button>
              ) : (
                <kbd className="pointer-events-none absolute right-4 top-1/2 hidden -translate-y-1/2 rounded-md border border-line bg-canvas px-2 py-0.5 font-mono text-xs text-muted sm:block">
                  /
                </kbd>
              )}
            </div>
          </form>
        </div>

        {recent.length > 0 && !searching && (
          <div className="relative hidden h-[300px] lg:block" aria-hidden>
            {recent.map((d, i) => (
              <motion.div
                key={d.id}
                initial={{ opacity: 0, y: 30, rotate: 0 }}
                animate={{ opacity: 1, y: 0, rotate: [-4, 2, -2][i] }}
                transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 100, damping: 20, delay: 0.4 + i * 0.12 }}
                className="absolute w-[70%] overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_24px_48px_-24px_rgba(20,24,31,0.35)]"
                style={{ left: `${i * 14}%`, top: `${i * 72}px` }}
              >
                <Thumb src={driveThumbnail(d.slidesFileId!, 480)} type={d.event.type} label="" />
              </motion.div>
            ))}
          </div>
        )}
      </section>

      {docs.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 pb-6" role="group" aria-label="Filters">
          {types.map((t) => (
            <FilterChip key={t} active={type === t} onClick={() => setType(type === t ? null : t)}>
              {EVENT_TYPE_STYLES[t].label}
            </FilterChip>
          ))}
          {tags.slice(0, 12).map((t) => (
            <FilterChip key={t} active={tag === t} onClick={() => setTag(tag === t ? null : t)}>
              {t}
            </FilterChip>
          ))}
        </div>
      )}

      {searching ? (
        <section aria-live="polite" aria-label="Search results">
          <p className="mb-4 text-sm text-muted">
            {results.length} {results.length === 1 ? "talk" : "talks"}
            {q.trim() && (
              <>
                {" "}
                for <span className="font-medium text-ink">{q.trim()}</span>
              </>
            )}
          </p>
          {results.length === 0 ? (
            <div className="flex flex-col items-start gap-4 rounded-[var(--radius-card)] border border-dashed border-line-strong p-8">
              <p className="text-lg font-medium">No talks match &lsquo;{q.trim() || [type, tag].filter(Boolean).join(", ")}&rsquo;</p>
              <p className="text-sm text-muted">Try a speaker&apos;s first name, a technology, or an event name.</p>
              <button
                type="button"
                onClick={clear}
                className="rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-white transition-transform active:scale-[0.98]"
              >
                Clear search
              </button>
            </div>
          ) : (
            <ul className="grid gap-4">
              <AnimatePresence mode="popLayout" initial={false}>
                {results.map((d) => (
                  <motion.li
                    key={d.id}
                    layout={!reduce}
                    initial={reduce ? false : { opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduce ? undefined : { opacity: 0 }}
                    transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <TalkRow talk={rowFromDoc(d)} showEvent />
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          )}
        </section>
      ) : (
        <section aria-label="Events">
          <h2 className="mb-6 text-2xl font-semibold tracking-tight">Events</h2>
          {events.length === 0 ? (
            <div className="rounded-[var(--radius-card)] border border-dashed border-line-strong p-10 text-muted">
              No events published yet. Check back after the next meetup.
            </div>
          ) : (
            <ul className="grid gap-5 md:grid-cols-2 lg:grid-cols-6">
              {events.map((e, i) => (
                <Reveal as="li" key={e.id} delay={Math.min(i, 4) * 0.06} className={i === 0 ? "md:col-span-2 lg:col-span-6" : "lg:col-span-3"}>
                  <EventCard event={e} featured={i === 0} />
                </Reveal>
              ))}
            </ul>
          )}
        </section>
      )}
    </>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`min-h-9 rounded-full border px-4 text-sm font-medium transition-colors active:scale-[0.98] ${
        active ? "border-ink bg-ink text-white" : "border-line-strong bg-surface text-muted hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}
