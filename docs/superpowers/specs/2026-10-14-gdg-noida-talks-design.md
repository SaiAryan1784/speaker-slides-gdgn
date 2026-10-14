# GDG Noida · Talks & Slides — Design Spec

Date: 2026-10-14 · Status: awaiting approval

## 1. Goal

A public site where anyone can browse GDG Noida events, see every talk in the
format **Speaker (LinkedIn) · designation — Talk title (slides)**, search across
everything, and view or download the slides without leaving the site. Organizers
manage events, talks and speakers from a password-protected admin panel.

Success = after an event, an organizer adds all talks in under 10 minutes, and an
attendee on a phone finds a talk by searching a speaker name or topic and flips
through the slides on the site.

## 2. Constraints and decisions

| Decision | Choice | Why |
|---|---|---|
| Cost | Free tiers only | Community project; no card on file anywhere |
| Hosting | Vercel Hobby | Free, Git deploys |
| Database | Neon Postgres free (`DATABASE_URL` already in `.env`) | Already provisioned |
| Slide files | **Not stored by us.** Admin pastes a Google Drive or Google Slides link | No storage cost or bandwidth lockout; Google renders GDG decks with the right fonts |
| Viewer | Google's preview/embed iframe inside our own viewer frame | Free, high fidelity |
| Download | Drive direct-download / Slides `export/pptx` URL | Free, no bandwidth on our side |
| Admin auth | One shared `ADMIN_PASSWORD` → signed httpOnly session cookie | 1–5 organizers; rotate password to revoke |
| Look | Light theme, Google brand 4-color accents, React Bits + Motion | Chosen by user |

**Non-goals (v1):** file uploads, compression (dropped by user with option B),
our own slide renderer, per-organizer accounts, dark mode, public submissions,
comments/likes, analytics.

## 3. Stack

- Next.js (App Router, latest stable) + TypeScript + Tailwind CSS v4
- Drizzle ORM + `@neondatabase/serverless` (HTTP driver); `drizzle-kit` migrations
- Zod for input validation (shared by server actions and forms)
- `motion` (Framer Motion) + selected React Bits components (copied into `components/reactbits/`)
- Fuse.js for instant fuzzy search on the client
- Vitest (unit/integration), Playwright (e2e against `next dev` + real Neon DB)
- pnpm

## 4. Data model

```
events
  id uuid pk · slug text unique · name text NOT NULL · type enum(devfest,
  io_extended, build_with_ai, meetup, workshop, other) default 'meetup'
  · date date NOT NULL · venue text · city text · description text
  · event_url text · cover_image_url text · published bool default false
  · created_at · updated_at

speakers                         -- reusable across events
  id uuid pk · name text NOT NULL · linkedin_url text · designation text
  · photo_url text · created_at · updated_at

talks
  id uuid pk · event_id fk → events ON DELETE CASCADE · slug text
  · title text NOT NULL · abstract text · tags text[] default '{}'
  · slides_url text            -- raw link as pasted
  · slides_kind enum(drive_file, google_slides, external) null
  · slides_file_id text        -- parsed Drive/Slides id
  · slides_public bool null    -- result of last anonymous check
  · position int NOT NULL      -- order within event
  · unique(event_id, slug)

talk_speakers
  talk_id fk → talks ON DELETE CASCADE · speaker_id fk → speakers ON DELETE RESTRICT
  · position int · pk(talk_id, speaker_id)
```

Designation lives on the speaker (current role), not per talk.
A speaker linked to any talk cannot be deleted (UI explains why).

## 5. Link handling (`lib/slides-link.ts`, pure function, unit-tested)

| Pasted link pattern | kind | Embed URL | Download URL |
|---|---|---|---|
| `drive.google.com/file/d/{id}/…`, `drive.google.com/open?id={id}`, `drive.google.com/uc?id={id}` | `drive_file` | `https://drive.google.com/file/d/{id}/preview` | `https://drive.google.com/uc?export=download&id={id}` |
| `docs.google.com/presentation/d/{id}/…` | `google_slides` | `https://docs.google.com/presentation/d/{id}/embed?start=false&loop=false` | `https://docs.google.com/presentation/d/{id}/export/pptx` |
| `docs.google.com/presentation/d/e/{pubId}/pub…` (published-to-web) | rejected | — | — form error: "Use the Share link (Anyone with the link), not the Publish-to-web link" |
| any other `https://` URL (Canva, PDF host…) | `external` | none — viewer shows "Open slides" button | none |
| non-URL / `http://` | rejected | — | — |

Thumbnail for cards/viewer poster: `https://drive.google.com/thumbnail?id={id}&sz=w800`
(works for both Drive and Slides ids). If it fails to load → designed fallback cover
(talk title on event-type color block).

Image links (speaker photo, event cover) go through the same parser: a Drive file
link becomes `https://drive.google.com/thumbnail?id={id}&sz=w{size}`; any other
https image URL is used as-is. Rendered with plain `<img>` (no Next image
optimization — avoids Hobby quota and arbitrary remote host config).

**Public check:** on save, the server fetches the thumbnail URL anonymously
(no cookies, 5s timeout). 200 + `image/*` → `slides_public = true`; anything else
→ `false` and the admin sees a warning. Save is never blocked by this check
(Google can be slow/flaky); the warning badge persists in the admin list.

## 6. Public site

**`/` Home**
- Hero: "GDG Noida · Talks & Slides", short line, big search input (focus with `/`).
- Search mode (query non-empty): instant results list of talks (fuzzy over talk
  title, abstract, tags, speaker names, designations, event name). Filter chips:
  event type, tag. Query + filters mirrored to URL (`?q=&type=&tag=`) so results
  are shareable and survive refresh/back.
- Browse mode (empty query): published events as cards, newest first
  (cover, type badge, name, date, city, talk count).
- Search index = all published talks, serialized into the page (small: hundreds of
  rows); Fuse runs client-side.

**`/events/[slug]`**
- Header: cover, type badge, name, date, venue/city, description, "Event page ↗".
- Talk list, ordered by `position`, each row in the requested format:
  `[photo] Speaker Name ↗(LinkedIn) · Designation — Talk Title → View slides`
  (multiple speakers joined with "&"). Tags as chips.
- Talk without slides: title is not a link, shows "Slides coming soon".

**`/events/[slug]/[talkSlug]` Viewer**
- Large 16:9 embed frame (Drive preview / Slides embed), loading skeleton,
  fullscreen button, "Download .pptx", "Open in Google Drive ↗".
- If iframe hasn't loaded after ~8s, overlay: "Preview taking a while — open in
  Drive" (Drive sometimes needs time after upload; private files show Google's
  "request access" page).
- `external` kind: no iframe; poster + "Open slides ↗".
- Speakers (photo, name→LinkedIn, designation), abstract, tags,
  prev/next talk in the same event.

Unpublished events and their talks return 404 publicly.

## 7. Admin (`/admin`)

- `/admin/login` → password form. Wrong password → "Wrong password", no cookie.
  5 failed attempts per IP per 10 min → "Too many attempts, wait" (in-memory per
  instance; good enough for Hobby).
- Session: `HS256` JWT in httpOnly, Secure, SameSite=Lax cookie, 30-day expiry,
  signed with `SESSION_SECRET`. **Every server action and admin page verifies
  the session itself** (middleware only redirects for UX; it is not the guard).
- `/admin` → events table (name, date, type, talk count, published toggle,
  warnings count) + "New event".
- `/admin/events/new`, `/admin/events/[id]` → event form (all fields from §4) +
  talks section: list with ↑/↓ reorder, edit, delete (confirm), "Add talk".
- Talk form: title, abstract, tags (comma/enter chips), slides link (live parse
  preview: kind + thumbnail), speakers multi-select with search over existing
  speakers + "New speaker" inline sub-form (name, LinkedIn, designation, photo).
- `/admin/speakers` → list/edit speakers; delete only when unused.
- Slugs auto-generated from name/title, editable, uniqueness enforced
  (event slug global, talk slug per event); collision → `-2` suffix suggestion.
- All mutations → `revalidatePath` for affected public pages.

## 8. Visual direction (detail decided during build with design-taste-frontend + ui-ux-pro-max)

Light, off-white canvas; Google blue/red/yellow/green as sparing accents (event
type color coding, focus rings, hover states). Large editorial headings, generous
spacing. Motion: staggered card entrance, layout animations when search filters
results, shared-element feel from card → viewer, subtle React Bits effects
(text reveal on hero, spotlight/tilt on cards). `prefers-reduced-motion` disables
non-essential motion. Mobile-first: list rows stack, viewer is full-width.

---

## 9. Definition of done

### 9a. Acceptance criteria

**Admin auth**
- AC-1: At `/admin/login`, entering the correct password lands on the events list; refreshing keeps the session.
- AC-2: Entering a wrong password shows "Wrong password" and stays on login.
- AC-3: Logged out, opening `/admin` or `/admin/events/<id>` redirects to `/admin/login`.
- AC-4: Logged out, submitting an admin mutation (e.g. replaying a create-event request) is rejected and changes nothing in the database.
- AC-5: Clicking "Log out" ends the session; going back to `/admin` redirects to login.

**Events (admin)**
- AC-6: Creating an event with name + date saves it as unpublished; it appears in the admin list but `/events/<slug>` returns 404 and it is not on the home page.
- AC-7: Toggling "Published" makes the event appear on the home page and its page load within one refresh.
- AC-8: Submitting the event form without a name or date shows inline field errors and saves nothing.
- AC-9: Creating a second event whose slug already exists shows "Slug already taken" with a suggested alternative.
- AC-10: Deleting an event (after confirm) removes it and its talks from admin and public pages.

**Talks & speakers (admin)**
- AC-11: In an event, adding a talk with a title, one new speaker (name, LinkedIn, designation, photo link) and a Drive .pptx link shows the talk in the event's talk list.
- AC-12: Pasting a Drive file link in the talk form immediately shows "Google Drive file" and a thumbnail preview; a Slides link shows "Google Slides".
- AC-13: Pasting a publish-to-web Slides link (`/d/e/…/pub`) shows the "Use the Share link…" error and the talk cannot be saved with it.
- AC-14: Saving a talk whose Drive link is private shows a "Link looks private — set sharing to Anyone with the link" warning; the talk still saves and shows a warning badge in the admin list.
- AC-15: A talk can have two speakers; both appear on the public page joined with "&", in the order chosen.
- AC-16: An existing speaker can be picked by typing part of their name in a second event's talk form; editing that speaker's designation updates it on both events' pages.
- AC-17: Trying to delete a speaker who is attached to a talk shows "Speaker is used in N talk(s)" and does not delete.
- AC-18: Using ↑/↓ on talks changes their order on the public event page.
- AC-19: A talk saved with no slides link shows "Slides coming soon" publicly and no viewer link.

**Public browsing & viewing**
- AC-20: Home lists published events newest-first with name, date, city, type badge and talk count.
- AC-21: On an event page each talk row reads: speaker name (clickable to LinkedIn in a new tab), designation, talk title (clickable to the viewer).
- AC-22: The viewer for a public Drive .pptx shows the slides inside the page; the user can page through them without leaving the site.
- AC-23: The viewer for a Google Slides link shows Google's slideshow embed inside the page.
- AC-24: "Download" on a Drive .pptx talk downloads the .pptx file; on a Slides talk it downloads a .pptx export.
- AC-25: An `external` link talk shows an "Open slides" button that opens the link in a new tab; no broken iframe.
- AC-26: If a thumbnail fails to load, the card shows the designed fallback cover (no broken-image icon).
- AC-27: Viewer prev/next buttons move between talks of the same event in order; first talk has no "prev".
- AC-28: Unknown event or talk slug shows a styled 404 with a link home.

**Search**
- AC-29: Typing a speaker name on the home page shows that speaker's talks while typing, without a page reload.
- AC-30: Typing a misspelling ("gemni") still finds talks about "Gemini".
- AC-31: Searching a tag or event name finds the matching talks; selecting a type/tag chip narrows results.
- AC-32: A search with no matches shows "No talks match '<q>'" and a "Clear search" button.
- AC-33: The URL reflects the query (`?q=`); reloading or sharing it shows the same results; Back restores previous state.
- AC-34: Talks from unpublished events never appear in search.

**Quality bars**
- AC-35: At 375px width, home, event page, viewer and admin forms have no horizontal scroll and all buttons are tappable.
- AC-36: With OS "reduce motion" on, pages render without entrance/hover animations.
- AC-37: Everything is reachable by keyboard; `/` focuses search; visible focus rings.
- AC-38: Home page Lighthouse performance ≥ 85 on mobile on the deployed site.

### 9b. Seam inventory

```
SEAM-1: Admin form → server action → Neon
  Risk:  Zod schema and DB columns drift; action succeeds in dev, fails on a
         column that the migration never added
  Proof: integration tests run server-action logic against the real migrated DB;
         `pnpm db:migrate` is a deploy checklist item

SEAM-2: Middleware/redirect → server actions (auth)
  Risk:  page redirect works but actions callable without a session
  Proof: AC-4 as an automated test (call action logic without session → throws,
         DB unchanged)

SEAM-3: Pasted link → link parser → Google embed/download URLs
  Risk:  a link shape we didn't anticipate; Google changes URL formats
  Proof: unit tests with real-world link variants (view, edit, usp, resourcekey,
         open?id, uc?id, /u/1/); demo steps 6–9 with real links

SEAM-4: Server → Google thumbnail endpoint (public check)
  Risk:  endpoint slow, blocked or rate-limited from Vercel; false "private"
  Proof: 5s timeout + never blocks save (AC-14); manual check on deployed site
         (demo step 8)

SEAM-5: Our page → Google iframe (preview/embed)
  Risk:  file private, Drive still processing, embed blocked by X-Frame-Options
         for some link types, CSP blocks frame
  Proof: our CSP allows `frame-src drive.google.com docs.google.com`;
         slow-load overlay; demo steps 10–12 with real public links

SEAM-6: Admin mutation → public pages (cache)
  Risk:  admin edits but public page stays stale (ISR/cache)
  Proof: e2e: publish/edit then load public page shows change (AC-7, AC-16, AC-18)

SEAM-7: Server-rendered search index → client Fuse
  Risk:  index includes unpublished talks or misses fields
  Proof: integration test on index builder (AC-34) + e2e search (AC-29–31)

SEAM-8: Local env → Vercel env
  Risk:  DATABASE_URL / ADMIN_PASSWORD / SESSION_SECRET set locally, missing in
         Vercel → runtime 500
  Proof: `lib/env.ts` validates with Zod at startup and fails with a named
         missing variable; deploy checklist; demo step 1 runs on deployed URL
```

### 9c. Demo script (run on local, then on the deployed Vercel URL)

Prereq: one public Drive .pptx link, one public Google Slides link, one private
Drive link, one Slides publish-to-web link.

1. Open `/admin` logged out → redirected to login. Enter wrong password → "Wrong password".
2. Enter correct password → events list.
3. Click "New event". Submit empty → field errors. Fill "DevFest Noida 2026", type DevFest, date, city Noida, venue, description, event link, cover image link. Save.
4. Open the public URL `/events/devfest-noida-2026` in a private window → 404 (unpublished).
5. Add talk "Building with Gemini" with new speaker (name, LinkedIn, designation, Drive photo link), tags "AI, Gemini".
6. Paste the public Drive .pptx link → "Google Drive file" + thumbnail appear. Save.
7. Add talk 2 with two speakers (one new, one existing picked by typing), paste the Slides link → "Google Slides". Save.
8. Add talk 3 with the private Drive link → saves with "Link looks private" warning badge.
9. Try adding talk 4 with the publish-to-web link → error, cannot save. Change to no link → saves.
10. Toggle Published. In private window: home shows the event card; event page lists 4 talks in the agreed format; talk 4 shows "Slides coming soon".
11. Open talk 1 → slides render in the page; flip slides; fullscreen; Download gives a .pptx.
12. Open talk 2 → Google Slides embed plays; Download gives a .pptx; "&" joins both speakers; LinkedIn opens in new tab.
13. Use ↓ to move talk 1 below talk 2 → public page order changes after refresh.
14. Home: type the speaker's name → talk appears as you type. Type "gemni" → still found. Type "zzzz" → empty state, Clear works. Reload with `?q=gemini` → same results.
15. Resize to 375px (devtools) → home, event, viewer, admin usable, no sideways scroll.
16. Try deleting the shared speaker in `/admin/speakers` → blocked with usage count.
17. Log out → `/admin` redirects to login.

### 9d. Test plan (derived from ACs)

| AC | Proof | Where |
|---|---|---|
| 12, 13, 25 + SEAM-3 | unit | `lib/slides-link.test.ts` (real-world link fixtures) |
| 1, 2, 3, 5 | e2e | `e2e/admin-auth.spec.ts` |
| 4 + SEAM-2 | integration | `tests/actions-auth.test.ts` (action without session → rejects, row count unchanged) |
| 6–10, 18, 19 | e2e | `e2e/admin-events.spec.ts` |
| 11, 15, 16, 17 | e2e + integration | `e2e/admin-talks.spec.ts`, `tests/speakers.test.ts` |
| 14 + SEAM-4 | integration (mocked fetch) + manual | `tests/public-check.test.ts`; demo step 8 |
| 20, 21, 27, 28 | e2e | `e2e/public.spec.ts` |
| 22, 23, 24 + SEAM-5 | manual (Google iframe can't be reliably scripted) | demo steps 11–12 |
| 26 | component/e2e | broken thumbnail URL → fallback asserted |
| 29–33 | e2e | `e2e/search.spec.ts` |
| 34 + SEAM-7 | integration | `tests/search-index.test.ts` |
| 35–37 | e2e (viewport 375, reducedMotion emulation, keyboard) + manual | `e2e/a11y.spec.ts`, demo step 15 |
| 38 | manual | Lighthouse on deployed URL |
| SEAM-6 | e2e | covered in admin-events/talks specs |
| SEAM-8 | unit + deploy checklist | `lib/env.test.ts` |

E2E tests run against the real Neon DB with data prefixed `e2e-` and cleaned up
after each run. (Optional: a Neon free-tier branch as `TEST_DATABASE_URL` if the
organizer wants test data isolated from production.)

## 10. Build order (vertical slices — each demoable)

0. **Spike (30 min):** link parser + iframe embed + anonymous thumbnail check with
   the user's real links, on a scratch page. Confirms SEAM-3/4/5 before building on them.
1. **Slice 1 — one talk end to end:** scaffold, env validation, schema + migration,
   admin login, create event + add talk with speaker + link, publish, public event
   page + viewer. (Demo steps 1–6, 10–12.)
2. **Slice 2 — discovery:** home page events grid, instant search + filters +
   URL state, polished visual design + motion. (Demo step 14.)
3. **Slice 3 — admin completeness:** multi-speaker, speaker reuse/management,
   reorder, delete, private-link warnings, no-slides/external/rejected links.
   (Demo steps 7–9, 13, 16.)
4. **Slice 4 — ship:** 404s, mobile/a11y/reduced-motion pass, metadata/OG,
   Lighthouse, deploy to Vercel, run full demo on production URL.

## 11. Deploy checklist

- Vercel project connected to the repo; env vars `DATABASE_URL`, `ADMIN_PASSWORD`, `SESSION_SECRET` set for Production.
- `pnpm db:migrate` run against the Neon DB before the first deploy, and after any schema change.
- Full demo script passes on the production URL.
- `ADMIN_PASSWORD` shared only with organizers; documented how to rotate (change env var → redeploy; `SESSION_SECRET` rotation logs everyone out).
