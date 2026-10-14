import { z } from "zod";
import { EVENT_TYPES } from "@/db/schema";

export type FieldErrors = Record<string, string>;

const blankToUndef = (v: unknown) => (typeof v === "string" && v.trim() === "" ? undefined : v);

const optionalText = (max: number) => z.preprocess(blankToUndef, z.string().trim().max(max).optional());

const optionalHttps = z.preprocess(
  blankToUndef,
  z
    .string()
    .trim()
    .max(2000)
    .refine((v) => {
      try {
        return new URL(v).protocol === "https:";
      } catch {
        return false;
      }
    }, "Must be a link starting with https://")
    .optional(),
);

const slug = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and dashes only");

export const eventSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(140),
  slug: z.preprocess(blankToUndef, slug.max(100).optional()),
  type: z.enum(EVENT_TYPES).default("meetup"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date is required"),
  venue: optionalText(200),
  city: optionalText(100),
  description: optionalText(2000),
  eventUrl: optionalHttps,
  coverImageUrl: optionalHttps,
  published: z.boolean().default(false),
});
export type EventInput = z.infer<typeof eventSchema>;

export const speakerSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  linkedinUrl: optionalHttps,
  designation: optionalText(160),
  photoUrl: optionalHttps,
});
export type SpeakerInput = z.infer<typeof speakerSchema>;

export const talkSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  slug: z.preprocess(blankToUndef, slug.max(120).optional()),
  abstract: optionalText(4000),
  tags: z
    .array(z.string().trim().min(1).max(30))
    .max(8, "At most 8 tags")
    .default([])
    .transform((t) => [...new Set(t)]),
  slidesUrl: z.preprocess(blankToUndef, z.string().trim().max(2000).optional()),
  speakerIds: z.array(z.string().uuid()).min(1, "Pick at least one speaker").max(6),
});
export type TalkInput = z.infer<typeof talkSchema>;

export function toFieldErrors(error: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const k = issue.path.join(".") || "form";
    out[k] ??= issue.message;
  }
  return out;
}
