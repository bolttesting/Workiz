import { Hono } from "hono";
import { adminDb } from "../lib/db.js";
import { hasCourseAccess } from "../lib/access.js";
import { presignGet, s3Configured } from "../lib/s3.js";
import { resolveMediaUrl } from "../lib/media-store.js";
import type { Authed } from "../lib/auth.js";

export const media = new Hono<{ Variables: { auth: Authed } }>();

media.get("/lessons/:id/playback", async (c) => {
  const auth = c.get("auth");
  const lessonId = c.req.param("id");
  const { data: lesson } = await adminDb.from("lessons").select("*").eq("id", lessonId).single();
  if (!lesson) return c.json({ error: "Not found" }, 404);
  const { data: module } = await adminDb.from("modules").select("course_id").eq("id", lesson.module_id).single();
  if (!module) return c.json({ error: "Not found" }, 404);
  const allowed = lesson.is_preview || (await hasCourseAccess(auth.profile, module.course_id));
  if (!allowed) return c.json({ error: "No access" }, 403);

  const { data: asset } = await adminDb.from("media_assets").select("*").eq("lesson_id", lessonId).maybeSingle();
  if (!asset) return c.json({ error: "No media" }, 404);

  const direct = resolveMediaUrl(asset.original_key, asset.public_url);
  if (direct) {
    return c.json({ status: asset.status || "ready", url: direct, type: "mp4" });
  }

  if (!s3Configured()) {
    return c.json({ error: "Video URL missing and S3 is not configured" }, 404);
  }

  if (asset.status !== "ready" || !asset.hls_prefix) {
    const fallback = await presignGet(asset.original_key, 300);
    return c.json({ status: asset.status, url: fallback, type: "mp4" });
  }
  const manifestKey = `${asset.hls_prefix.replace(/\/$/, "")}/index.m3u8`;
  const url = await presignGet(manifestKey, 180);
  return c.json({ status: "ready", url, type: "hls" });
});

media.get("/files/:key{.+}", async (c) => {
  const auth = c.get("auth");
  const key = c.req.param("key");
  if (key.startsWith("invoices/")) {
    const { data: invoice } = await adminDb.from("invoices").select("order_id, pdf_key").eq("pdf_key", key).maybeSingle();
    if (!invoice) return c.json({ error: "Not found" }, 404);
    const { data: order } = await adminDb.from("orders").select("*").eq("id", invoice.order_id).single();
    const ok =
      auth.profile.role === "super_admin" ||
      order?.user_id === auth.userId ||
      (order?.organization_id && order.organization_id === auth.profile.organization_id);
    if (!ok) return c.json({ error: "Forbidden" }, 403);
  } else if (key.startsWith("certificates/")) {
    const { data: cert } = await adminDb.from("certificates").select("*").eq("pdf_key", key).maybeSingle();
    if (!cert) return c.json({ error: "Not found" }, 404);
    if (cert.user_id !== auth.userId && auth.profile.role !== "super_admin") {
      return c.json({ error: "Forbidden" }, 403);
    }
  } else if (key.startsWith("uploads/lessons/") || key.startsWith("resources/") || key.startsWith("media/")) {
    const { data: resource } = await adminDb
      .from("lesson_resources")
      .select("id, lesson_id, file_url")
      .eq("file_key", key)
      .maybeSingle();
    if (!resource) return c.json({ error: "Not found" }, 404);
    const { data: lesson } = await adminDb.from("lessons").select("*").eq("id", resource.lesson_id).single();
    if (!lesson) return c.json({ error: "Not found" }, 404);
    const { data: module } = await adminDb.from("modules").select("course_id").eq("id", lesson.module_id).single();
    if (!module) return c.json({ error: "Not found" }, 404);
    const allowed =
      auth.profile.role === "super_admin" ||
      lesson.is_preview ||
      (await hasCourseAccess(auth.profile, module.course_id));
    if (!allowed) return c.json({ error: "Forbidden" }, 403);
    const direct = resolveMediaUrl(key, resource.file_url);
    if (direct) return c.json({ url: direct });
  } else {
    return c.json({ error: "Forbidden" }, 403);
  }
  if (!s3Configured()) return c.json({ error: "File storage not configured" }, 503);
  const url = await presignGet(key, 120);
  return c.json({ url });
});

media.get("/resources/:id/download", async (c) => {
  const auth = c.get("auth");
  const { data: resource } = await adminDb
    .from("lesson_resources")
    .select("*")
    .eq("id", c.req.param("id"))
    .maybeSingle();
  if (!resource) return c.json({ error: "Not found" }, 404);
  const { data: lesson } = await adminDb.from("lessons").select("*").eq("id", resource.lesson_id).single();
  if (!lesson) return c.json({ error: "Not found" }, 404);
  const { data: module } = await adminDb.from("modules").select("course_id").eq("id", lesson.module_id).single();
  if (!module) return c.json({ error: "Not found" }, 404);
  const allowed =
    auth.profile.role === "super_admin" ||
    lesson.is_preview ||
    (await hasCourseAccess(auth.profile, module.course_id));
  if (!allowed) return c.json({ error: "Forbidden" }, 403);

  const direct = resolveMediaUrl(resource.file_key, resource.file_url);
  if (direct) {
    return c.json({ url: direct, title: resource.title, contentType: resource.content_type });
  }
  if (typeof resource.file_key === "string" && resource.file_key.startsWith("storage:")) {
    const rest = resource.file_key.slice("storage:".length);
    const slash = rest.indexOf("/");
    const bucketName = slash >= 0 ? rest.slice(0, slash) : "uploads";
    const path = slash >= 0 ? rest.slice(slash + 1) : rest;
    const { data, error } = await adminDb.storage.from(bucketName).createSignedUrl(path, 120);
    if (error || !data?.signedUrl) return c.json({ error: error?.message || "Not found" }, 404);
    return c.json({ url: data.signedUrl, title: resource.title, contentType: resource.content_type });
  }
  if (!s3Configured()) return c.json({ error: "File storage not configured" }, 503);
  const url = await presignGet(resource.file_key, 120);
  return c.json({ url, title: resource.title, contentType: resource.content_type });
});
