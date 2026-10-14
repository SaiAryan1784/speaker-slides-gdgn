import "server-only";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { env } from "./env";
import {
  SESSION_COOKIE,
  SESSION_DAYS,
  checkPassword,
  createRateLimiter,
  signSession,
  verifySession,
} from "./auth-core";

const limiter = createRateLimiter({ max: 5, windowMs: 10 * 60 * 1000 });

export async function isAdmin(): Promise<boolean> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return verifySession(token, env().SESSION_SECRET);
}

/** Guard for every admin page and server action. The proxy redirect is UX only. */
export async function requireAdmin(): Promise<void> {
  if (!(await isAdmin())) redirect("/admin/login");
}

export type LoginResult = { ok: true } | { ok: false; error: string };

export async function login(password: string): Promise<LoginResult> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (limiter.isBlocked(ip)) return { ok: false, error: "Too many attempts, wait a few minutes" };
  if (!checkPassword(password, env().ADMIN_PASSWORD)) {
    limiter.fail(ip);
    return { ok: false, error: "Wrong password" };
  }
  limiter.reset(ip);
  (await cookies()).set(SESSION_COOKIE, await signSession(env().SESSION_SECRET), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 86400,
  });
  return { ok: true };
}

export async function logout(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}
