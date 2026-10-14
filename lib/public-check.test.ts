import { describe, expect, it } from "vitest";
import { checkThumbnailPublic } from "./public-check";

const resp = (status: number, type: string) =>
  (async () => new Response("x", { status, headers: { "content-type": type } })) as unknown as typeof fetch;

describe("checkThumbnailPublic", () => {
  it("true for an image response", async () => {
    expect(await checkThumbnailPublic("https://x", resp(200, "image/png"))).toBe(true);
  });
  it("false when Google serves a sign-in page", async () => {
    expect(await checkThumbnailPublic("https://x", resp(200, "text/html; charset=utf-8"))).toBe(false);
  });
  it("false on 404", async () => {
    expect(await checkThumbnailPublic("https://x", resp(404, "text/html"))).toBe(false);
  });
  it("null (unknown) on 5xx, 429 and network errors", async () => {
    expect(await checkThumbnailPublic("https://x", resp(503, "text/html"))).toBeNull();
    expect(await checkThumbnailPublic("https://x", resp(429, "text/html"))).toBeNull();
    const boom = (async () => {
      throw new Error("net");
    }) as unknown as typeof fetch;
    expect(await checkThumbnailPublic("https://x", boom)).toBeNull();
  });
});
