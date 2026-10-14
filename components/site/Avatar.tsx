"use client";

import { useState } from "react";
import { imageUrl } from "@/lib/slides-link";

const TINTS = ["bg-g-blue-tint text-g-blue-ink", "bg-g-red-tint text-g-red", "bg-g-green-tint text-g-green", "bg-g-yellow-tint text-g-yellow-ink"];

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

export function Avatar({ name, photoUrl, size = 40 }: { name: string; photoUrl: string | null; size?: number }) {
  const [failed, setFailed] = useState(false);
  const src = imageUrl(photoUrl, size * 3);
  const tint = TINTS[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % TINTS.length];
  const box = { width: size, height: size };
  if (!src || failed) {
    return (
      <span
        style={{ ...box, fontSize: size * 0.38 }}
        className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold ${tint}`}
        aria-hidden
      >
        {initials(name)}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- remote photo
    <img
      src={src}
      alt=""
      style={box}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className="shrink-0 rounded-full object-cover ring-1 ring-line"
    />
  );
}
