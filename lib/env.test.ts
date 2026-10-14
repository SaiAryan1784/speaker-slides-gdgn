import { describe, expect, it } from "vitest";
import { parseEnv } from "./env";

describe("parseEnv", () => {
  const good = { DATABASE_URL: "postgres://x", ADMIN_PASSWORD: "longenough", SESSION_SECRET: "x".repeat(32) };
  it("accepts a complete environment", () => {
    expect(parseEnv(good)).toEqual(good);
  });
  it("names every missing variable", () => {
    expect(() => parseEnv({})).toThrow(/DATABASE_URL.*ADMIN_PASSWORD.*SESSION_SECRET/);
  });
  it("rejects a short session secret", () => {
    expect(() => parseEnv({ ...good, SESSION_SECRET: "short" })).toThrow(/SESSION_SECRET/);
  });
});
