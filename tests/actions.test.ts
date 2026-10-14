import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { like } from "drizzle-orm";

const state = vi.hoisted(() => ({ token: undefined as string | undefined, isPublic: true as boolean | null }));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Error(`NEXT_REDIRECT:${to}`);
  },
}));
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => (state.token ? { value: state.token } : undefined), set: vi.fn(), delete: vi.fn() }),
  headers: async () => new Headers({ "x-forwarded-for": "9.9.9.9" }),
}));
vi.mock("@/lib/public-check", () => ({ checkThumbnailPublic: async () => state.isPublic }));

import { db, events, speakers } from "@/db";
import { signSession } from "@/lib/auth-core";
import { env } from "@/lib/env";
import { getPublishedEvent, getSearchIndex, listSpeakers, listTalksForEvent } from "@/lib/queries";
import * as actions from "@/app/admin/actions";

const RUN = `itest-${Date.now().toString(36)}`;
const DRIVE = "https://drive.google.com/file/d/1AbCdEfGhIjKlMnOpQrStUvWxYz_0123456789/view?usp=sharing";
const SLIDES = "https://docs.google.com/presentation/d/1ZyXwVuTsRqPoNmLkJiHgFeDcBa_9876543210/edit?usp=sharing";

const eventInput = (over: Record<string, unknown> = {}) => ({
  name: `${RUN} DevFest`,
  slug: `${RUN}-devfest`,
  type: "devfest",
  date: "2026-11-01",
  city: "Noida",
  published: false,
  ...over,
});

async function asAdmin() {
  state.token = await signSession(env().SESSION_SECRET);
}

async function mkEvent(over: Record<string, unknown> = {}) {
  const r = await actions.saveEvent(null, eventInput(over));
  if (!r.ok) throw new Error(JSON.stringify(r.errors));
  return r.data;
}
async function mkSpeaker(name: string) {
  const r = await actions.saveSpeaker(null, { name: `${RUN} ${name}`, designation: "Engineer", linkedinUrl: "https://linkedin.com/in/x" });
  if (!r.ok) throw new Error(JSON.stringify(r.errors));
  return r.data;
}

beforeEach(async () => {
  state.isPublic = true;
  await asAdmin();
});

afterAll(async () => {
  await db().delete(events).where(like(events.slug, `${RUN}%`));
  await db().delete(speakers).where(like(speakers.name, `${RUN}%`));
});

describe("auth guard (AC-4, SEAM-2)", () => {
  it("rejects every mutation without a session and writes nothing", async () => {
    state.token = undefined;
    const before = (await db().select().from(events).where(like(events.slug, `${RUN}%`))).length;
    await expect(actions.saveEvent(null, eventInput({ slug: `${RUN}-nosession` }))).rejects.toThrow(/NEXT_REDIRECT:\/admin\/login/);
    await expect(actions.saveSpeaker(null, { name: `${RUN} ghost` })).rejects.toThrow(/NEXT_REDIRECT/);
    await expect(actions.deleteEvent("00000000-0000-0000-0000-000000000000")).rejects.toThrow(/NEXT_REDIRECT/);
    await expect(actions.setPublished("00000000-0000-0000-0000-000000000000", true)).rejects.toThrow(/NEXT_REDIRECT/);
    const after = (await db().select().from(events).where(like(events.slug, `${RUN}%`))).length;
    expect(after).toBe(before);
    expect((await listSpeakers()).some((s) => s.name === `${RUN} ghost`)).toBe(false);
  });
  it("rejects a forged token", async () => {
    state.token = await signSession("x".repeat(40));
    await expect(actions.saveEvent(null, eventInput({ slug: `${RUN}-forged` }))).rejects.toThrow(/NEXT_REDIRECT/);
  });
});

describe("events (AC-6, 8, 9, 10)", () => {
  it("validates required fields", async () => {
    const r = await actions.saveEvent(null, { name: "", date: "" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.errors)).toEqual(expect.arrayContaining(["name", "date"]));
  });
  it("saves unpublished by default, hidden from public queries", async () => {
    const e = await mkEvent({ slug: `${RUN}-hidden` });
    expect(await getPublishedEvent(e.slug)).toBeNull();
    await actions.setPublished(e.id, true);
    expect((await getPublishedEvent(e.slug))?.event.name).toBe(`${RUN} DevFest`);
  });
  it("rejects a duplicate slug and suggests another", async () => {
    await mkEvent({ slug: `${RUN}-dup` });
    const r = await actions.saveEvent(null, eventInput({ slug: `${RUN}-dup` }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.slug).toContain(`${RUN}-dup-2`);
  });
  it("lets an event keep its own slug when editing", async () => {
    const e = await mkEvent({ slug: `${RUN}-self` });
    const r = await actions.saveEvent(e.id, eventInput({ slug: `${RUN}-self`, city: "Delhi" }));
    expect(r.ok).toBe(true);
  });
  it("deleting an event removes its talks but keeps speakers", async () => {
    const e = await mkEvent({ slug: `${RUN}-del` });
    const s = await mkSpeaker("Keeper");
    const t = await actions.saveTalk(e.id, null, { title: "Gone", speakerIds: [s.id] });
    expect(t.ok).toBe(true);
    await actions.deleteEvent(e.id);
    expect(await listTalksForEvent(e.id)).toEqual([]);
    expect((await listSpeakers()).some((x) => x.id === s.id)).toBe(true);
  });
});

describe("talks (AC-11–19)", () => {
  it("stores kind, file id and public flag for a Drive link", async () => {
    const e = await mkEvent({ slug: `${RUN}-drive` });
    const s = await mkSpeaker("A");
    const r = await actions.saveTalk(e.id, null, { title: "Drive talk", speakerIds: [s.id], slidesUrl: DRIVE });
    expect(r.ok && r.warning).toBeFalsy();
    const [t] = await listTalksForEvent(e.id);
    expect(t).toMatchObject({ slidesKind: "drive_file", slidesFileId: "1AbCdEfGhIjKlMnOpQrStUvWxYz_0123456789", slidesPublic: true });
  });
  it("recognises Google Slides links", async () => {
    const e = await mkEvent({ slug: `${RUN}-gs` });
    const s = await mkSpeaker("B");
    await actions.saveTalk(e.id, null, { title: "Slides talk", speakerIds: [s.id], slidesUrl: SLIDES });
    expect((await listTalksForEvent(e.id))[0].slidesKind).toBe("google_slides");
  });
  it("rejects publish-to-web links and saves nothing (AC-13)", async () => {
    const e = await mkEvent({ slug: `${RUN}-pub` });
    const s = await mkSpeaker("C");
    const r = await actions.saveTalk(e.id, null, {
      title: "Bad link",
      speakerIds: [s.id],
      slidesUrl: "https://docs.google.com/presentation/d/e/2PACX-1vAbCdEf/pub?start=false",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.slidesUrl).toMatch(/Share link/);
    expect(await listTalksForEvent(e.id)).toEqual([]);
  });
  it("saves a private link with a warning (AC-14)", async () => {
    state.isPublic = false;
    const e = await mkEvent({ slug: `${RUN}-priv` });
    const s = await mkSpeaker("D");
    const r = await actions.saveTalk(e.id, null, { title: "Private", speakerIds: [s.id], slidesUrl: DRIVE });
    expect(r.ok && r.warning).toMatch(/looks private/);
    expect((await listTalksForEvent(e.id))[0].slidesPublic).toBe(false);
  });
  it("saves without slides (AC-19)", async () => {
    const e = await mkEvent({ slug: `${RUN}-noslides` });
    const s = await mkSpeaker("E");
    const r = await actions.saveTalk(e.id, null, { title: "Coming soon", speakerIds: [s.id], slidesUrl: "" });
    expect(r.ok).toBe(true);
    expect((await listTalksForEvent(e.id))[0]).toMatchObject({ slidesUrl: null, slidesKind: null });
  });
  it("requires at least one speaker and a title", async () => {
    const e = await mkEvent({ slug: `${RUN}-req` });
    const r = await actions.saveTalk(e.id, null, { title: "", speakerIds: [] });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.errors)).toEqual(expect.arrayContaining(["title", "speakerIds"]));
  });
  it("keeps speaker order for two speakers (AC-15)", async () => {
    const e = await mkEvent({ slug: `${RUN}-two` });
    const a = await mkSpeaker("First");
    const b = await mkSpeaker("Second");
    await actions.saveTalk(e.id, null, { title: "Duo", speakerIds: [b.id, a.id] });
    const [t] = await listTalksForEvent(e.id);
    expect(t.speakers.map((s) => s.id)).toEqual([b.id, a.id]);
  });
  it("auto-suffixes duplicate talk titles within an event, rejects explicit duplicate slug", async () => {
    const e = await mkEvent({ slug: `${RUN}-slugs` });
    const s = await mkSpeaker("F");
    const one = await actions.saveTalk(e.id, null, { title: "Same Title", speakerIds: [s.id] });
    const two = await actions.saveTalk(e.id, null, { title: "Same Title", speakerIds: [s.id] });
    expect(one.ok && two.ok && [one.data.slug, two.data.slug]).toEqual(["same-title", "same-title-2"]);
    const dup = await actions.saveTalk(e.id, null, { title: "X", slug: "same-title", speakerIds: [s.id] });
    expect(dup.ok).toBe(false);
  });
  it("editing a talk replaces its speakers", async () => {
    const e = await mkEvent({ slug: `${RUN}-edit` });
    const a = await mkSpeaker("G");
    const b = await mkSpeaker("H");
    const created = await actions.saveTalk(e.id, null, { title: "Edit me", speakerIds: [a.id] });
    if (!created.ok) throw new Error("setup");
    await actions.saveTalk(e.id, created.data.id, { title: "Edited", slug: created.data.slug, speakerIds: [b.id] });
    const [t] = await listTalksForEvent(e.id);
    expect(t.title).toBe("Edited");
    expect(t.speakers.map((s) => s.id)).toEqual([b.id]);
  });
  it("reorders talks with moveTalk (AC-18)", async () => {
    const e = await mkEvent({ slug: `${RUN}-order` });
    const s = await mkSpeaker("I");
    const t1 = await actions.saveTalk(e.id, null, { title: "One", speakerIds: [s.id] });
    const t2 = await actions.saveTalk(e.id, null, { title: "Two", speakerIds: [s.id] });
    const t3 = await actions.saveTalk(e.id, null, { title: "Three", speakerIds: [s.id] });
    if (!t1.ok || !t2.ok || !t3.ok) throw new Error("setup");
    await actions.moveTalk(t3.data.id, "up");
    expect((await listTalksForEvent(e.id)).map((t) => t.title)).toEqual(["One", "Three", "Two"]);
    await actions.moveTalk(t1.data.id, "up"); // already first: no-op
    await actions.moveTalk(t2.data.id, "down"); // already last: no-op
    expect((await listTalksForEvent(e.id)).map((t) => t.title)).toEqual(["One", "Three", "Two"]);
  });
});

describe("speakers (AC-16, 17)", () => {
  it("blocks deleting a speaker used in a talk, allows deleting an unused one", async () => {
    const e = await mkEvent({ slug: `${RUN}-sp` });
    const used = await mkSpeaker("Used");
    const free = await mkSpeaker("Free");
    await actions.saveTalk(e.id, null, { title: "Uses speaker", speakerIds: [used.id] });
    const blocked = await actions.deleteSpeaker(used.id);
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.errors.form).toBe("Speaker is used in 1 talk");
    expect((await actions.deleteSpeaker(free.id)).ok).toBe(true);
  });
  it("one speaker edit shows up on every event they appear in", async () => {
    const e1 = await mkEvent({ slug: `${RUN}-s1`, published: true });
    const e2 = await mkEvent({ slug: `${RUN}-s2`, published: true });
    const s = await mkSpeaker("Shared");
    await actions.saveTalk(e1.id, null, { title: "T1", speakerIds: [s.id] });
    await actions.saveTalk(e2.id, null, { title: "T2", speakerIds: [s.id] });
    await actions.saveSpeaker(s.id, { name: `${RUN} Shared`, designation: "Staff Engineer, Acme" });
    for (const slug of [`${RUN}-s1`, `${RUN}-s2`]) {
      const found = await getPublishedEvent(slug);
      expect(found?.talks[0].speakers[0].designation).toBe("Staff Engineer, Acme");
    }
  });
});

describe("search index (AC-34, SEAM-7)", () => {
  it("contains published talks only", async () => {
    const pub = await mkEvent({ slug: `${RUN}-ix-pub`, published: true });
    const hid = await mkEvent({ slug: `${RUN}-ix-hid`, published: false });
    const s = await mkSpeaker("Idx");
    await actions.saveTalk(pub.id, null, { title: `${RUN} visible`, speakerIds: [s.id], tags: ["AI"] });
    await actions.saveTalk(hid.id, null, { title: `${RUN} secret`, speakerIds: [s.id] });
    const titles = (await getSearchIndex()).map((d) => d.title);
    expect(titles).toContain(`${RUN} visible`);
    expect(titles).not.toContain(`${RUN} secret`);
    const doc = (await getSearchIndex()).find((d) => d.title === `${RUN} visible`)!;
    expect(doc.tags).toEqual(["AI"]);
    expect(doc.speakers[0].name).toBe(`${RUN} Idx`);
    expect(doc.event.slug).toBe(`${RUN}-ix-pub`);
  });
});
