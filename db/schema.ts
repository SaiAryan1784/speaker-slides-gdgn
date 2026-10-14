import {
  boolean,
  date,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

export const EVENT_TYPES = ["devfest", "io_extended", "build_with_ai", "meetup", "workshop", "other"] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export const eventTypeEnum = pgEnum("event_type", EVENT_TYPES);
export const slidesKindEnum = pgEnum("slides_kind", ["drive_file", "google_slides", "external"]);

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
};

export const events = pgTable("events", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  type: eventTypeEnum("type").notNull().default("meetup"),
  date: date("date", { mode: "string" }).notNull(),
  venue: text("venue"),
  city: text("city"),
  description: text("description"),
  eventUrl: text("event_url"),
  coverImageUrl: text("cover_image_url"),
  published: boolean("published").notNull().default(false),
  ...timestamps,
});

export const speakers = pgTable("speakers", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  linkedinUrl: text("linkedin_url"),
  designation: text("designation"),
  photoUrl: text("photo_url"),
  ...timestamps,
});

export const talks = pgTable(
  "talks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    abstract: text("abstract"),
    tags: text("tags").array().notNull().default([]),
    slidesUrl: text("slides_url"),
    slidesKind: slidesKindEnum("slides_kind"),
    slidesFileId: text("slides_file_id"),
    slidesPublic: boolean("slides_public"),
    position: integer("position").notNull().default(0),
    ...timestamps,
  },
  (t) => [unique("talks_event_slug").on(t.eventId, t.slug)],
);

export const talkSpeakers = pgTable(
  "talk_speakers",
  {
    talkId: uuid("talk_id")
      .notNull()
      .references(() => talks.id, { onDelete: "cascade" }),
    speakerId: uuid("speaker_id")
      .notNull()
      .references(() => speakers.id, { onDelete: "restrict" }),
    position: integer("position").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.talkId, t.speakerId] })],
);

export type Event = typeof events.$inferSelect;
export type Speaker = typeof speakers.$inferSelect;
export type Talk = typeof talks.$inferSelect;
