"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowSquareOutIcon, CornersOutIcon, DownloadSimpleIcon } from "@phosphor-icons/react";

type Props = {
  title: string;
  kind: "drive_file" | "google_slides" | "external";
  embedUrl: string | null;
  downloadUrl: string | null;
  openUrl: string;
};

const SLOW_MS = 8000;

export function SlideViewer({ title, kind, embedUrl, downloadUrl, openUrl }: Props) {
  const frame = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    if (!embedUrl || loaded) return;
    const t = setTimeout(() => setSlow(true), SLOW_MS);
    return () => clearTimeout(t);
  }, [embedUrl, loaded]);

  const openLabel = kind === "google_slides" ? "Open in Google Slides" : kind === "drive_file" ? "Open in Google Drive" : "Open slides";

  return (
    <div>
      {embedUrl ? (
        <div ref={frame} className="relative aspect-video w-full overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface">
          {!loaded && <div className="skeleton absolute inset-0" aria-hidden />}
          <iframe
            src={embedUrl}
            title={`Slides: ${title}`}
            allow="fullscreen"
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer"
            onLoad={() => {
              setLoaded(true);
              setSlow(false);
            }}
            className="absolute inset-0 size-full"
          />
          {slow && !loaded && (
            <div role="status" className="absolute inset-x-4 bottom-4 flex flex-col gap-2 rounded-2xl border border-line bg-surface/95 p-4 text-sm shadow-lg sm:flex-row sm:items-center sm:justify-between">
              <span className="text-muted">Preview is taking a while. Google may still be processing the file.</span>
              <a href={openUrl} target="_blank" rel="noopener noreferrer" className="shrink-0 font-medium text-g-blue-ink underline underline-offset-4">
                {openLabel}
              </a>
            </div>
          )}
        </div>
      ) : (
        <div className="flex aspect-video w-full flex-col items-center justify-center gap-4 rounded-[var(--radius-card)] border border-dashed border-line-strong bg-surface p-6 text-center">
          <p className="max-w-[40ch] text-muted">These slides are hosted outside Google, so they open on their own site.</p>
          <a
            href={openUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-g-blue px-6 py-3 font-medium text-white transition-transform active:scale-[0.98]"
          >
            Open slides <ArrowSquareOutIcon size={18} weight="bold" aria-hidden />
          </a>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {embedUrl && (
          <button
            type="button"
            onClick={() => frame.current?.requestFullscreen?.()}
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line-strong bg-surface px-5 text-sm font-medium transition-colors hover:border-ink active:scale-[0.98]"
          >
            <CornersOutIcon size={18} aria-hidden /> Fullscreen
          </button>
        )}
        {downloadUrl && (
          <a
            href={downloadUrl}
            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-g-blue px-5 text-sm font-medium text-white transition-transform active:scale-[0.98]"
          >
            <DownloadSimpleIcon size={18} weight="bold" aria-hidden /> Download slides
          </a>
        )}
        {embedUrl && (
          <a
            href={openUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line-strong bg-surface px-5 text-sm font-medium transition-colors hover:border-ink"
          >
            <ArrowSquareOutIcon size={18} aria-hidden /> {openLabel}
          </a>
        )}
      </div>
    </div>
  );
}
