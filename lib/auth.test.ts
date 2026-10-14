import { describe, expect, it } from "vitest";
import { checkPassword, createRateLimiter, signSession, verifySession } from "./auth-core";

const SECRET = "s".repeat(40);

describe("session tokens", () => {
  it("round-trips a valid token", async () => {
    const t = await signSession(SECRET);
    expect(await verifySession(t, SECRET)).toBe(true);
  });
  it("rejects a token signed with another secret", async () => {
    const t = await signSession("o".repeat(40));
    expect(await verifySession(t, SECRET)).toBe(false);
  });
  it("rejects garbage and empty values", async () => {
    expect(await verifySession("nope", SECRET)).toBe(false);
    expect(await verifySession(undefined, SECRET)).toBe(false);
    expect(await verifySession("", SECRET)).toBe(false);
  });
  it("rejects an expired token", async () => {
    const t = await signSession(SECRET, -10);
    expect(await verifySession(t, SECRET)).toBe(false);
  });
});

describe("checkPassword", () => {
  it("accepts only the exact password", () => {
    expect(checkPassword("hunter2hunter2", "hunter2hunter2")).toBe(true);
    expect(checkPassword("hunter2hunter3", "hunter2hunter2")).toBe(false);
    expect(checkPassword("", "hunter2hunter2")).toBe(false);
    expect(checkPassword("short", "hunter2hunter2")).toBe(false);
  });
});

describe("rate limiter", () => {
  it("blocks the 6th failure inside the window and recovers after it", () => {
    let now = 1_000;
    const rl = createRateLimiter({ max: 5, windowMs: 600_000, now: () => now });
    for (let i = 0; i < 5; i++) {
      expect(rl.isBlocked("ip")).toBe(false);
      rl.fail("ip");
    }
    expect(rl.isBlocked("ip")).toBe(true);
    expect(rl.isBlocked("other")).toBe(false);
    now += 600_001;
    expect(rl.isBlocked("ip")).toBe(false);
  });
  it("clears the counter on success", () => {
    const rl = createRateLimiter({ max: 2, windowMs: 1000, now: () => 0 });
    rl.fail("ip");
    rl.reset("ip");
    rl.fail("ip");
    expect(rl.isBlocked("ip")).toBe(false);
  });
});
