import type { EventType } from "@/db/schema";

type TypeStyle = { label: string; chip: string; solid: string; ring: string };

/** Google-color coding for event types. Yellow text uses a darker ink for contrast. */
export const EVENT_TYPE_STYLES: Record<EventType, TypeStyle> = {
  devfest: { label: "DevFest", chip: "bg-g-blue-tint text-g-blue-ink", solid: "bg-g-blue", ring: "ring-g-blue/30" },
  io_extended: { label: "I/O Extended", chip: "bg-g-red-tint text-g-red", solid: "bg-g-red", ring: "ring-g-red/30" },
  build_with_ai: { label: "Build with AI", chip: "bg-g-green-tint text-g-green", solid: "bg-g-green", ring: "ring-g-green/30" },
  meetup: { label: "Meetup", chip: "bg-g-yellow-tint text-g-yellow-ink", solid: "bg-g-yellow", ring: "ring-g-yellow/40" },
  workshop: { label: "Workshop", chip: "bg-g-green-tint text-g-green", solid: "bg-g-green", ring: "ring-g-green/30" },
  other: { label: "Event", chip: "bg-line text-muted", solid: "bg-muted", ring: "ring-line-strong" },
};

export function formatDate(iso: string, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-IN", { ...opts, timeZone: "UTC" });
}
