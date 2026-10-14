import { SignJWT, jwtVerify } from "jose";
import { timingSafeEqual, createHash } from "node:crypto";

export const SESSION_COOKIE = "gdg_admin";
export const SESSION_DAYS = 30;

const key = (secret: string) => new TextEncoder().encode(secret);

/** `ttlSeconds` is overridable so tests can mint an already-expired token. */
export async function signSession(secret: string, ttlSeconds = SESSION_DAYS * 86400): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({ role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt(now)
    .setExpirationTime(now + ttlSeconds)
    .sign(key(secret));
}

export async function verifySession(token: string | undefined, secret: string): Promise<boolean> {
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, key(secret), { algorithms: ["HS256"] });
    return payload.role === "admin";
  } catch {
    return false;
  }
}

/** Constant-time compare via fixed-length digests, so length is not leaked. */
export function checkPassword(given: string, expected: string): boolean {
  const a = createHash("sha256").update(given).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b) && given.length > 0;
}

export function createRateLimiter(opts: { max: number; windowMs: number; now?: () => number }) {
  const now = opts.now ?? Date.now;
  const hits = new Map<string, { count: number; start: number }>();
  const live = (k: string) => {
    const h = hits.get(k);
    if (!h) return undefined;
    if (now() - h.start > opts.windowMs) {
      hits.delete(k);
      return undefined;
    }
    return h;
  };
  return {
    isBlocked: (k: string) => (live(k)?.count ?? 0) >= opts.max,
    fail: (k: string) => {
      const h = live(k);
      if (h) h.count++;
      else hits.set(k, { count: 1, start: now() });
    },
    reset: (k: string) => void hits.delete(k),
  };
}
