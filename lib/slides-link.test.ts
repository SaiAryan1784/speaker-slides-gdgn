import { describe, expect, it } from "vitest";
import { imageUrl, parseSlidesLink, slugify } from "./slides-link";

const ID = "1AbCdEfGhIjKlMnOpQrStUvWxYz_0123456789";

describe("parseSlidesLink — drive files", () => {
  const variants = [
    `https://drive.google.com/file/d/${ID}/view?usp=sharing`,
    `https://drive.google.com/file/d/${ID}/view?usp=drive_link&resourcekey=0-abc`,
    `https://drive.google.com/file/d/${ID}/edit`,
    `https://drive.google.com/file/u/1/d/${ID}/view`,
    `https://drive.google.com/open?id=${ID}`,
    `https://drive.google.com/uc?id=${ID}&export=download`,
    `  https://drive.google.com/file/d/${ID}/view  `,
  ];
  for (const url of variants) {
    it(`parses ${url.trim()}`, () => {
      const r = parseSlidesLink(url);
      expect(r).toMatchObject({ ok: true, kind: "drive_file", fileId: ID });
      if (r.ok) {
        expect(r.embedUrl).toBe(`https://drive.google.com/file/d/${ID}/preview`);
        expect(r.downloadUrl).toBe(`https://drive.google.com/uc?export=download&id=${ID}`);
        expect(r.thumbnailUrl).toBe(`https://drive.google.com/thumbnail?id=${ID}&sz=w800`);
      }
    });
  }
});

describe("parseSlidesLink — google slides", () => {
  for (const url of [
    `https://docs.google.com/presentation/d/${ID}/edit?usp=sharing`,
    `https://docs.google.com/presentation/d/${ID}/edit#slide=id.p`,
    `https://docs.google.com/presentation/u/0/d/${ID}/edit`,
    `https://docs.google.com/presentation/d/${ID}`,
  ]) {
    it(`parses ${url}`, () => {
      const r = parseSlidesLink(url);
      expect(r).toMatchObject({ ok: true, kind: "google_slides", fileId: ID });
      if (r.ok) {
        expect(r.embedUrl).toBe(`https://docs.google.com/presentation/d/${ID}/embed?start=false&loop=false`);
        expect(r.downloadUrl).toBe(`https://docs.google.com/presentation/d/${ID}/export/pptx`);
      }
    });
  }
});

describe("parseSlidesLink — rejected and external", () => {
  it("rejects publish-to-web slides links with guidance", () => {
    const r = parseSlidesLink("https://docs.google.com/presentation/d/e/2PACX-1vAbC/pub?start=false");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/Share link/);
  });
  it("rejects non-urls", () => {
    expect(parseSlidesLink("not a url").ok).toBe(false);
    expect(parseSlidesLink("").ok).toBe(false);
  });
  it("rejects http and javascript urls", () => {
    expect(parseSlidesLink("http://example.com/x.pptx").ok).toBe(false);
    expect(parseSlidesLink("javascript:alert(1)").ok).toBe(false);
  });
  it("rejects a drive folder", () => {
    expect(parseSlidesLink("https://drive.google.com/drive/folders/abc123").ok).toBe(false);
  });
  it("treats other https urls as external with no embed", () => {
    const r = parseSlidesLink("https://www.canva.com/design/xyz/view");
    expect(r).toMatchObject({ ok: true, kind: "external", fileId: null, embedUrl: null, downloadUrl: null });
  });
});

describe("imageUrl", () => {
  it("converts drive file links to thumbnail urls", () => {
    expect(imageUrl(`https://drive.google.com/file/d/${ID}/view`, 400)).toBe(
      `https://drive.google.com/thumbnail?id=${ID}&sz=w400`,
    );
  });
  it("passes other https urls through", () => {
    expect(imageUrl("https://example.com/a.jpg", 400)).toBe("https://example.com/a.jpg");
  });
  it("returns null for junk or non-https", () => {
    expect(imageUrl("", 400)).toBeNull();
    expect(imageUrl("http://example.com/a.jpg", 400)).toBeNull();
    expect(imageUrl(null, 400)).toBeNull();
  });
});

describe("slugify", () => {
  it("lowercases, strips accents and symbols", () => {
    expect(slugify("DevFest Noida 2026!")).toBe("devfest-noida-2026");
    expect(slugify("  Café & Código  ")).toBe("cafe-codigo");
  });
  it("falls back when empty", () => {
    expect(slugify("!!!")).toBe("untitled");
  });
});
