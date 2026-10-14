import { expect, test, type Page } from "@playwright/test";
import { DRIVE_LINK, PASSWORD, RUN, SLIDES_LINK, cleanup, login } from "./helpers";

test.describe.configure({ mode: "serial" });
test.afterAll(cleanup);

const EVENT_NAME = `${RUN} DevFest Noida`;
const SLUG = `${RUN}-devfest`;
const SPEAKER_A = `E2E ${RUN} Aarav Mehta`;
const SPEAKER_B = `E2E ${RUN} Diya Kapoor`;
let eventUrl = "";

async function addSpeakerInline(page: Page, name: string, designation: string) {
  await page.getByRole("button", { name: "New speaker" }).click();
  await page.getByLabel(/^Name/).last().fill(name);
  await page.getByLabel("Designation").fill(designation);
  await page.getByLabel("LinkedIn link").fill("https://www.linkedin.com/in/example");
  await page.getByRole("button", { name: "Add speaker" }).click();
  await expect(page.getByRole("list", { name: /Selected speakers/ })).toContainText(name);
}

test("AC-1/2/3: login wrong then right; logged-out admin redirects", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login/);
  await page.getByLabel("Organizer password").fill("definitely-wrong");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText("Wrong password")).toBeVisible();
  await login(page);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Events", exact: true })).toBeVisible();
});

test("AC-8/6/9: event validation, draft is hidden publicly, duplicate slug rejected", async ({ page, browser }) => {
  await login(page);
  await page.getByRole("link", { name: "New event" }).click();
  await page.getByRole("button", { name: "Create event" }).click();
  await expect(page.getByText("Name is required")).toBeVisible();
  await expect(page.getByText("Date is required")).toBeVisible();

  await page.getByLabel(/Event name/).fill(EVENT_NAME);
  await page.getByLabel("URL slug").fill(SLUG);
  await page.getByLabel("Event type").selectOption("devfest");
  await page.getByLabel(/^Date/).fill("2026-12-05");
  await page.getByLabel("Venue").fill("Galgotias University");
  await page.getByLabel("City").fill("Noida");
  await page.getByLabel("Description").fill("A full day of Google tech talks.");
  await page.getByRole("button", { name: "Create event" }).click();
  await expect(page).toHaveURL(/\/admin\/events\/[0-9a-f-]{36}$/);
  eventUrl = page.url();

  // draft: 404 for the public (AC-6)
  const anon = await (await browser.newContext()).newPage();
  const res = await anon.goto(`/events/${SLUG}`);
  expect(res?.status()).toBe(404);
  await anon.close();

  // duplicate slug (AC-9)
  await page.goto("/admin/events/new");
  await page.getByLabel(/Event name/).fill(EVENT_NAME);
  await page.getByLabel("URL slug").fill(SLUG);
  await page.getByLabel(/^Date/).fill("2026-12-06");
  await page.getByRole("button", { name: "Create event" }).click();
  await expect(page.getByText(/Slug already taken/)).toBeVisible();
  await expect(page.getByText(`${SLUG}-2`)).toBeVisible();
});

test("AC-11/12/13/14/15/19: talks, link parsing, private warning, two speakers, no-slides", async ({ page }) => {
  await login(page);
  await page.goto(eventUrl);

  // talk 1: new speaker + Drive link
  await page.getByRole("button", { name: "Add talk" }).click();
  await page.getByLabel(/Talk title/).fill("Building with Gemini");
  await addSpeakerInline(page, SPEAKER_A, "Staff Engineer, Acme Labs");
  await page.getByLabel("Slides link").fill(DRIVE_LINK);
  await expect(page.getByText("Google Drive file")).toBeVisible(); // AC-12
  await page.getByLabel("Tags").fill("AI, Gemini,");
  await expect(page.getByRole("button", { name: "Remove tag Gemini" })).toBeVisible();
  await page.getByRole("button", { name: "Add talk", exact: true }).last().click();
  // fake id → Google says not public → warning, but saved (AC-14)
  await expect(page.getByRole("status").filter({ hasText: "Link looks private" })).toBeVisible();
  await expect(page.getByText("Building with Gemini")).toBeVisible();

  // talk 2: Slides link + existing speaker picked by typing + second new speaker (AC-15)
  await page.getByRole("button", { name: "Add talk" }).click();
  await page.getByLabel(/Talk title/).fill("Flutter in production");
  await page.getByLabel("Find an existing speaker").fill("aarav");
  await page.getByRole("list", { name: "Matching speakers" }).getByRole("button").first().click();
  await addSpeakerInline(page, SPEAKER_B, "Developer Advocate");
  await page.getByLabel("Slides link").fill(SLIDES_LINK);
  await expect(page.getByText("Google Slides", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Add talk", exact: true }).last().click();
  await expect(page.getByText("Flutter in production")).toBeVisible();

  // publish-to-web link rejected inline, cannot save (AC-13)
  await page.getByRole("button", { name: "Add talk" }).click();
  await page.getByLabel(/Talk title/).fill("Bad link talk");
  await page.getByLabel("Find an existing speaker").fill("diya");
  await page.getByRole("list", { name: "Matching speakers" }).getByRole("button").first().click();
  await page.getByLabel("Slides link").fill("https://docs.google.com/presentation/d/e/2PACX-1vAbCdEfGh/pub?start=false");
  await expect(page.getByText(/Use the Share link/)).toBeVisible();
  await page.getByRole("button", { name: "Add talk", exact: true }).last().click();
  await expect(page.getByText(/Use the Share link/)).toBeVisible();
  await expect(page.getByLabel(/Talk title/)).toBeVisible(); // form still open: nothing saved

  // clear the link: saves with no slides (AC-19)
  await page.getByLabel("Slides link").fill("");
  await page.getByRole("button", { name: "Add talk", exact: true }).last().click();
  await expect(page.getByText("No slides yet")).toBeVisible();
});

test("AC-18: reorder with arrows", async ({ page }) => {
  await login(page);
  await page.goto(eventUrl);
  const titles = () => page.locator("ol > li p.font-semibold").allTextContents();
  expect(await titles()).toEqual(["Building with Gemini", "Flutter in production", "Bad link talk"]);
  await page.getByRole("button", { name: "Move Bad link talk up" }).click();
  await expect.poll(titles).toEqual(["Building with Gemini", "Bad link talk", "Flutter in production"]);
  await page.getByRole("button", { name: "Move Bad link talk down" }).click();
  await expect.poll(titles).toEqual(["Building with Gemini", "Flutter in production", "Bad link talk"]);
});

test("AC-7/20/21/22/23/24/27: publish, public pages, viewer, prev/next", async ({ page, browser }) => {
  await login(page);
  await page.goto(eventUrl);
  await page.getByLabel(/Published/).check();
  await page.getByRole("button", { name: "Save event" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Saved" })).toBeVisible();

  const anon = await (await browser.newContext()).newPage();
  await anon.goto("/");
  const card = anon.getByRole("link", { name: new RegExp(`${EVENT_NAME}, 3 talks`) });
  await expect(card).toBeVisible(); // AC-7, AC-20

  await anon.goto(`/events/${SLUG}`);
  await expect(anon.getByRole("heading", { level: 1, name: EVENT_NAME })).toBeVisible();
  const first = anon.locator("article").first();
  await expect(first).toContainText(SPEAKER_A); // AC-21
  await expect(first).toContainText("Staff Engineer, Acme Labs");
  const li = first.getByRole("link", { name: `${SPEAKER_A} on LinkedIn` });
  await expect(li).toHaveAttribute("href", "https://www.linkedin.com/in/example");
  await expect(li).toHaveAttribute("target", "_blank");
  await expect(anon.locator("article").nth(1)).toContainText(`${SPEAKER_A}`);
  await expect(anon.locator("article").nth(1)).toContainText(`${SPEAKER_B}`); // AC-15 both speakers
  await expect(anon.locator("article").nth(2)).toContainText("Slides coming soon"); // AC-19

  // viewer: Drive file (AC-22)
  await anon.getByRole("link", { name: "Building with Gemini" }).click();
  await expect(anon).toHaveURL(new RegExp(`/events/${SLUG}/building-with-gemini$`));
  const frame = anon.locator("iframe");
  await expect(frame).toHaveAttribute("src", "https://drive.google.com/file/d/1AbCdEfGhIjKlMnOpQrStUvWxYz_0123456789/preview");
  await expect(anon.getByRole("link", { name: /Download slides/ })).toHaveAttribute(
    "href",
    "https://drive.google.com/uc?export=download&id=1AbCdEfGhIjKlMnOpQrStUvWxYz_0123456789",
  ); // AC-24
  await expect(anon.getByRole("link", { name: /Previous talk/ })).toHaveCount(0); // AC-27: first talk
  await anon.getByRole("link", { name: /Next talk/ }).click();

  // viewer: Google Slides (AC-23)
  await expect(anon).toHaveURL(new RegExp(`/events/${SLUG}/flutter-in-production$`));
  await expect(anon.locator("iframe")).toHaveAttribute("src", /docs\.google\.com\/presentation\/d\/.+\/embed/);
  await expect(anon.getByRole("link", { name: /Download slides/ })).toHaveAttribute("href", /\/export\/pptx$/);
  await anon.close();
});

test("AC-28: unknown event and talk show a styled 404", async ({ page }) => {
  const r1 = await page.goto("/events/does-not-exist");
  expect(r1?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: /couldn.t find that page/i })).toBeVisible();
  await expect(page.getByRole("link", { name: "Back to all events" })).toBeVisible();
  const r2 = await page.goto(`/events/${SLUG}/nope`);
  expect(r2?.status()).toBe(404);
  const r3 = await page.goto(`/events/${SLUG}/bad-link-talk`); // no slides: no viewer page
  expect(r3?.status()).toBe(404);
});

test("AC-29/30/31/32/33/34: search", async ({ page }) => {
  await page.goto("/");
  const q = page.getByRole("searchbox", { name: /Search talks/ });

  await q.fill("aarav");
  await expect(page.getByRole("heading", { name: "Building with Gemini" })).toBeVisible(); // AC-29, live
  await expect(page.getByRole("heading", { name: "Flutter in production" })).toBeVisible();

  await q.fill("gemni"); // AC-30 typo tolerance
  await expect(page.getByRole("heading", { name: "Building with Gemini" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Flutter in production" })).toHaveCount(0);

  await q.fill("");
  await page.getByRole("button", { name: "AI", exact: true }).click(); // AC-31 tag chip
  await expect(page.getByRole("heading", { name: "Building with Gemini" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Flutter in production" })).toHaveCount(0);
  await page.getByRole("button", { name: "AI", exact: true }).click();

  await q.fill("zzzzqqq"); // AC-32
  await expect(page.getByText(/No talks match/)).toBeVisible();
  await page.getByRole("button", { name: "Clear search", exact: true }).last().click();
  await expect(q).toHaveValue("");

  await q.fill("devfest noida"); // event name
  await expect(page.getByRole("heading", { name: "Building with Gemini" })).toBeVisible();

  await q.fill("gemini"); // AC-33 URL state
  await expect(page).toHaveURL(/\?q=gemini/);
  await page.reload();
  await expect(q).toHaveValue("gemini");
  await expect(page.getByRole("heading", { name: "Building with Gemini" })).toBeVisible();

  await page.goto("/");
  await page.waitForLoadState("networkidle"); // let React hydrate before using the shortcut
  await page.keyboard.press("/"); // AC-37
  await expect(q).toBeFocused();
});

test("AC-34: draft events never appear in search", async ({ page }) => {
  await login(page);
  await page.goto("/admin");
  await page.getByRole("switch", { name: `Unpublish ${EVENT_NAME}` }).click();
  await expect(page.getByRole("switch", { name: `Publish ${EVENT_NAME}` })).toBeVisible();
  await page.waitForTimeout(1000);
  const anon = await page.context().browser()!.newContext();
  const p = await anon.newPage();
  await p.goto("/?q=gemini");
  await expect(p.getByText(/No talks match/)).toBeVisible();
  await anon.close();
  await page.getByRole("switch", { name: `Publish ${EVENT_NAME}` }).click(); // restore for later tests
});

test("AC-35: no horizontal scroll at 375px on public and admin pages", async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 375, height: 800 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  const overflow = async () => {
    const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    if (over > 0) {
      const wide = await page.evaluate(() =>
        [...document.querySelectorAll("*")]
          .filter((el) => el.getBoundingClientRect().right > document.documentElement.clientWidth + 1)
          .slice(0, 6)
          .map((el) => `${el.tagName.toLowerCase()}.${(el.getAttribute("class") ?? "").slice(0, 60)} right=${Math.round(el.getBoundingClientRect().right)}`),
      );
      console.log("OVERFLOW", over, wide.join(" | "));
    }
    return over;
  };
  for (const path of ["/", `/events/${SLUG}`, `/events/${SLUG}/building-with-gemini`]) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    expect(await overflow(), path).toBeLessThanOrEqual(0);
  }
  await page.goto("/admin/login");
  await page.getByLabel("Organizer password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Events", exact: true })).toBeVisible();
  for (const path of ["/admin", eventUrl.replace(/^https?:\/\/[^/]+/, ""), "/admin/speakers"]) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    expect(await overflow(), path).toBeLessThanOrEqual(0);
  }
  await ctx.close();
});

test("AC-36: reduced motion setting is honoured", async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: "reduce" });
  const page = await ctx.newPage();
  await page.goto(`/events/${SLUG}`);
  const dur = await page.evaluate(() => getComputedStyle(document.querySelector("article")!).transitionDuration);
  expect(parseFloat(dur)).toBeLessThan(0.01);
  await ctx.close();
});

test("AC-17/10/5: speaker in use is protected; delete event; logout", async ({ page }) => {
  await login(page);
  await page.goto("/admin/speakers");
  await page.getByRole("button", { name: `Delete ${SPEAKER_A}` }).click();
  await expect(page.getByText("Speaker is used in 2 talks")).toBeVisible();

  await page.goto(eventUrl);
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await page.getByRole("button", { name: "Yes, delete" }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByText(EVENT_NAME)).toHaveCount(0);

  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page).toHaveURL(/\/admin\/login/);
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login/);
});
