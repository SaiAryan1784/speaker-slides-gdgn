export type SlidesKind = "drive_file" | "google_slides" | "external";

export type ParsedSlides =
  | {
      ok: true;
      kind: SlidesKind;
      fileId: string | null;
      embedUrl: string | null;
      downloadUrl: string | null;
      thumbnailUrl: string | null;
    }
  | { ok: false; error: string };

const ID_RE = /^[A-Za-z0-9_-]{10,}$/;

export function driveThumbnail(id: string, width: number): string {
  return `https://drive.google.com/thumbnail?id=${id}&sz=w${width}`;
}

function toUrl(raw: string): URL | null {
  try {
    const u = new URL(raw.trim());
    return u.protocol === "https:" ? u : null;
  } catch {
    return null;
  }
}

/** Extract a Drive file id from the many shapes Drive links take. */
function driveFileId(u: URL): string | null {
  if (u.hostname !== "drive.google.com") return null;
  const m = u.pathname.match(/\/file\/(?:u\/\d+\/)?d\/([^/]+)/);
  if (m && ID_RE.test(m[1])) return m[1];
  if (u.pathname === "/open" || u.pathname === "/uc") {
    const id = u.searchParams.get("id");
    if (id && ID_RE.test(id)) return id;
  }
  return null;
}

export function parseSlidesLink(raw: string): ParsedSlides {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) return { ok: false, error: "Paste a link starting with https://" };
  const u = toUrl(trimmed);
  if (!u) return { ok: false, error: "That doesn't look like an https:// link" };

  if (u.hostname === "docs.google.com" && u.pathname.startsWith("/presentation/")) {
    if (/^\/presentation\/(?:u\/\d+\/)?d\/e\//.test(u.pathname)) {
      return {
        ok: false,
        error: "Use the Share link (Anyone with the link), not the Publish-to-web link",
      };
    }
    const m = u.pathname.match(/^\/presentation\/(?:u\/\d+\/)?d\/([^/]+)/);
    if (m && ID_RE.test(m[1])) {
      const id = m[1];
      return {
        ok: true,
        kind: "google_slides",
        fileId: id,
        embedUrl: `https://docs.google.com/presentation/d/${id}/embed?start=false&loop=false`,
        downloadUrl: `https://docs.google.com/presentation/d/${id}/export/pptx`,
        thumbnailUrl: driveThumbnail(id, 800),
      };
    }
    return { ok: false, error: "Couldn't find the presentation id in that Slides link" };
  }

  if (u.hostname === "drive.google.com") {
    const id = driveFileId(u);
    if (!id) {
      return { ok: false, error: "Paste a link to a single Drive file, not a folder" };
    }
    return {
      ok: true,
      kind: "drive_file",
      fileId: id,
      embedUrl: `https://drive.google.com/file/d/${id}/preview`,
      downloadUrl: `https://drive.google.com/uc?export=download&id=${id}`,
      thumbnailUrl: driveThumbnail(id, 800),
    };
  }

  return { ok: true, kind: "external", fileId: null, embedUrl: null, downloadUrl: null, thumbnailUrl: null };
}

/** Speaker photos / event covers: Drive file link → thumbnail endpoint; other https urls pass through. */
export function imageUrl(raw: string | null | undefined, width: number): string | null {
  if (!raw) return null;
  const u = toUrl(raw);
  if (!u) return null;
  const id = driveFileId(u);
  return id ? driveThumbnail(id, width) : u.toString();
}

export function slugify(input: string): string {
  const s = input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return s || "untitled";
}
