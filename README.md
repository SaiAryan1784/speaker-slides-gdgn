# GDG Noida Talks & Slides

Public site to browse events, talks and speakers, search them, and view or download slides.
Organizers manage everything from `/admin`. Slides are **links** to Google Drive or Google
Slides files (nothing is uploaded to this app), so hosting stays on free tiers.

Stack: Next.js (App Router), Tailwind v4, Motion, React Bits, Drizzle + Neon Postgres. Spec:
`docs/superpowers/specs/2026-10-14-gdg-noida-talks-design.md`.

## Run locally

```bash
pnpm install
cp .env.example .env   # fill in the three values
pnpm db:migrate        # creates the tables in your Neon database
pnpm dev
```

| Variable | What it is |
|---|---|
| `DATABASE_URL` | Neon connection string |
| `ADMIN_PASSWORD` | Shared organizer password (8+ characters) |
| `SESSION_SECRET` | Random string, 32+ characters (`openssl rand -hex 32`) |

## Using the admin (`/admin`)

1. Sign in with `ADMIN_PASSWORD`.
2. **New event**, fill it in, tick **Published** when ready.
3. In the event, **Add talk**: title, speakers (pick existing or add new), slides link, tags.
4. Slides link: in Google Drive use *Share > Anyone with the link > Viewer*, then paste the link.
   Google Slides share links work too. Publish-to-web links are rejected on purpose.

A talk saved with a private link shows a warning badge in the admin list. Fix the sharing and save again.

## Tests

```bash
pnpm test        # unit + integration (uses the real Neon DB, cleans up after itself)
pnpm e2e         # Playwright against a local dev server (needs Chrome)
```

## Deploy to Vercel (free Hobby plan)

1. Push this repo to GitHub and import it in Vercel.
2. Add `DATABASE_URL`, `ADMIN_PASSWORD`, `SESSION_SECRET` under Project Settings > Environment Variables (Production).
3. Run `pnpm db:migrate` against the Neon database before the first deploy and after any schema change.
4. After deploy, walk the demo script in the spec (section 9c) on the live URL.

Rotate the password: change `ADMIN_PASSWORD` in Vercel and redeploy. Changing `SESSION_SECRET` logs everyone out.
