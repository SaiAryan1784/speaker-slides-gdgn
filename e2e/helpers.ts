import { neon } from "@neondatabase/serverless";
import { expect, type Page } from "@playwright/test";

export const RUN = `e2e-${Date.now().toString(36)}`;
export const PASSWORD = process.env.ADMIN_PASSWORD!;

// Fake ids shaped like real Drive/Slides ids. Google will answer "not found", which exercises the
// private-link warning path without depending on any real file.
export const DRIVE_LINK = "https://drive.google.com/file/d/1AbCdEfGhIjKlMnOpQrStUvWxYz_0123456789/view?usp=sharing";
export const SLIDES_LINK = "https://docs.google.com/presentation/d/1ZyXwVuTsRqPoNmLkJiHgFeDcBa_9876543210/edit?usp=sharing";

export async function login(page: Page) {
  await page.goto("/admin/login");
  await page.getByLabel("Organizer password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Events", exact: true })).toBeVisible();
}

export async function cleanup() {
  const sql = neon(process.env.DATABASE_URL!);
  await sql`delete from events where slug like ${RUN + "%"}`;
  await sql`delete from speakers where name like ${"E2E " + RUN + "%"}`;
}
