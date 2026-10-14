"use client";

import { useState } from "react";
import { PresentationIcon } from "@phosphor-icons/react";
import type { EventType } from "@/db/schema";
import { EVENT_TYPE_STYLES } from "@/lib/event-types";

/** Slide/cover image with a designed fallback, so a failed load never shows a broken-image icon (AC-26). */
export function Thumb({
  src,
  type,
  label,
  className = "",
  ratio = "aspect-video",
}: {
  src: string | null;
  type: EventType;
  label: string;
  className?: string;
  ratio?: string;
}) {
  const [failed, setFailed] = useState(false);
  const style = EVENT_TYPE_STYLES[type];
  if (!src || failed) {
    return (
      <div
        role="img"
        aria-label={label}
        data-testid="thumb-fallback"
        className={`${ratio} ${className} relative flex items-center justify-center overflow-hidden ${style.chip}`}
      >
        <PresentationIcon size={28} weight="duotone" aria-hidden />
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- remote Google thumbnails; Next image optimisation is not used (free-tier quota)
    <img
      src={src}
      alt={label}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={`${ratio} ${className} object-cover`}
    />
  );
}
