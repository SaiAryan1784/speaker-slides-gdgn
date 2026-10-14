/**
 * Is this slides file readable by anyone? Ask Google's thumbnail endpoint without cookies.
 * Public files answer with an image; private ones redirect to a sign-in HTML page.
 * Returns null when we couldn't tell (timeout / network) so callers don't show a false warning.
 */
export async function checkThumbnailPublic(
  thumbnailUrl: string,
  fetchImpl: typeof fetch = fetch,
  timeoutMs = 5000,
): Promise<boolean | null> {
  try {
    const res = await fetchImpl(thumbnailUrl, {
      redirect: "follow",
      signal: AbortSignal.timeout(timeoutMs),
      headers: { "user-agent": "Mozilla/5.0 (compatible; GDGNoidaSlidesCheck/1.0)" },
    });
    if (res.status >= 500 || res.status === 429) return null;
    const type = res.headers.get("content-type") ?? "";
    return res.ok && type.startsWith("image/");
  } catch {
    return null;
  }
}
