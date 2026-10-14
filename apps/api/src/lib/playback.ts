import { adminDb } from "./db.js";
import { presignGet, s3Configured } from "./s3.js";
import { resolveMediaUrl } from "./media-store.js";

export type Playback =
  | { ok: true; status: string; url: string; type: "mp4" | "hls" }
  | { ok: false; error: string; code: 404 };

/** Playable URL for a lesson's video. Callers decide who may see it. */
export async function lessonPlayback(lessonId: string): Promise<Playback> {
  const { data: asset } = await adminDb.from("media_assets").select("*").eq("lesson_id", lessonId).maybeSingle();
  if (!asset) return { ok: false, error: "No media", code: 404 };

  const direct = resolveMediaUrl(asset.original_key, asset.public_url);
  if (direct) return { ok: true, status: asset.status || "ready", url: direct, type: "mp4" };

  if (!s3Configured()) {
    return { ok: false, error: "Video URL missing and S3 is not configured", code: 404 };
  }

  if (asset.status !== "ready" || !asset.hls_prefix) {
    const fallback = await presignGet(asset.original_key, 300);
    return { ok: true, status: asset.status, url: fallback, type: "mp4" };
  }
  const manifestKey = `${asset.hls_prefix.replace(/\/$/, "")}/index.m3u8`;
  const url = await presignGet(manifestKey, 180);
  return { ok: true, status: "ready", url, type: "hls" };
}
