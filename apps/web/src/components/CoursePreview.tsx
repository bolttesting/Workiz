"use client";

import { useEffect, useRef, useState } from "react";
import { Play, X } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export type PreviewLesson = {
  id: string;
  title: string;
  type: "video" | "article";
  /** Sanitized by the API; only present for article previews. */
  articleHtml?: string | null;
};

type Playback = { url: string; type: "mp4" | "hls" };

/**
 * "Watch free lesson" trigger plus a native <dialog> player. Video URLs come from the public
 * preview endpoint, which only serves lessons marked as previews on a published course.
 */
export function CoursePreviewButton({
  slug,
  lesson,
  variant = "inline",
  label,
}: {
  slug: string;
  lesson: PreviewLesson;
  variant?: "inline" | "hero";
  label?: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [open, setOpen] = useState(false);
  const [playback, setPlayback] = useState<Playback | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    if (!open || lesson.type !== "video" || playback) return;
    let cancelled = false;
    fetch(`${API_URL}/courses/${slug}/preview/${lesson.id}`)
      .then(async (res) => {
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error || "This preview is not available right now.");
        if (!cancelled) setPlayback({ url: json.url, type: json.type });
      })
      .catch((err) => {
        if (!cancelled) setError((err as Error).message);
      });
    return () => {
      cancelled = true;
    };
  }, [open, lesson, slug, playback]);

  useEffect(() => {
    const video = videoRef.current;
    if (!open || !video || !playback) return;
    if (playback.type === "mp4" || video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = playback.url;
      return;
    }
    let destroyed = false;
    let hls: { destroy: () => void } | null = null;
    void import("hls.js").then(({ default: Hls }) => {
      if (destroyed) return;
      if (!Hls.isSupported()) {
        setError("Your browser cannot play this video.");
        return;
      }
      const instance = new Hls();
      instance.loadSource(playback.url);
      instance.attachMedia(video);
      hls = instance;
    });
    return () => {
      destroyed = true;
      hls?.destroy();
    };
  }, [open, playback]);

  function close() {
    videoRef.current?.pause();
    setOpen(false);
  }

  const text = label ?? (lesson.type === "video" ? "Watch free lesson" : "Read free lesson");

  return (
    <>
      <button
        type="button"
        className={variant === "hero" ? "workiz-preview-hero" : "workiz-preview-link"}
        onClick={() => setOpen(true)}
      >
        <Play size={variant === "hero" ? 18 : 12} strokeWidth={2.4} aria-hidden="true" />
        <span>{text}</span>
      </button>

      <dialog
        ref={dialogRef}
        className="workiz-preview-dialog"
        aria-label={`Free preview: ${lesson.title}`}
        onClose={() => setOpen(false)}
        onClick={(event) => {
          if (event.target === event.currentTarget) close();
        }}
      >
        <div className="workiz-preview-dialog__inner">
          <header className="workiz-preview-dialog__head">
            <div>
              <span className="workiz-preview-dialog__eyebrow">Free preview</span>
              <h2>{lesson.title}</h2>
            </div>
            <button type="button" className="workiz-preview-dialog__close" onClick={close} aria-label="Close preview">
              <X size={18} aria-hidden="true" />
            </button>
          </header>

          {open && lesson.type === "video" ? (
            error ? (
              <p className="workiz-preview-dialog__error">{error}</p>
            ) : (
              <video
                ref={videoRef}
                className="workiz-preview-dialog__video"
                controls
                autoPlay
                playsInline
                controlsList="nodownload"
                onContextMenu={(event) => event.preventDefault()}
                onError={() => setError("This preview is not available right now.")}
              />
            )
          ) : null}

          {open && lesson.type === "article" ? (
            <div
              className="workiz-preview-dialog__article"
              dangerouslySetInnerHTML={{ __html: lesson.articleHtml || "<p>This reading is empty.</p>" }}
            />
          ) : null}
        </div>
      </dialog>
    </>
  );
}
