import { Hono } from "hono";
import { z } from "zod";
import { nanoid } from "nanoid";
import { requireRole, type Authed } from "../lib/auth.js";
import { adminDb } from "../lib/db.js";
import { presignPut } from "../lib/s3.js";
import { transcodeQueue } from "../lib/queue.js";

export const admin = new Hono<{ Variables: { auth: Authed } }>();
admin.use("*", requireRole("super_admin"));

admin.get("/stats", async (c) => {
  const [{ count: users }, { count: orgs }, { count: courses }, { count: orders }] = await Promise.all([
    adminDb.from("profiles").select("*", { count: "exact", head: true }),
    adminDb.from("organizations").select("*", { count: "exact", head: true }),
    adminDb.from("courses").select("*", { count: "exact", head: true }),
    adminDb.from("orders").select("*", { count: "exact", head: true }).eq("status", "paid"),
  ]);
  return c.json({ users: users ?? 0, orgs: orgs ?? 0, courses: courses ?? 0, orders: orders ?? 0 });
});

const courseSchema = z.object({
  title: z.string().min(3),
  slug: z.string().min(3),
  subtitle: z.string().optional(),
  description: z.string().optional(),
  thumbnail_url: z.string().optional(),
  price_cents: z.number().int().min(0),
  currency: z.string().default("usd"),
  published: z.boolean().optional(),
  duration_minutes: z.number().int().optional(),
  level: z.string().optional(),
});

admin.get("/courses", async (c) => {
  const { data } = await adminDb.from("courses").select("*").order("created_at", { ascending: false });
  return c.json({ courses: data ?? [] });
});

admin.post("/courses", async (c) => {
  const parsed = courseSchema.safeParse(await c.req.json());
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);
  const { data, error } = await adminDb.from("courses").insert(parsed.data).select("*").single();
  if (error) return c.json({ error: error.message }, 400);
  return c.json({ course: data });
});

admin.patch("/courses/:id", async (c) => {
  const parsed = courseSchema.partial().safeParse(await c.req.json());
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);
  const { data, error } = await adminDb.from("courses").update(parsed.data).eq("id", c.req.param("id")).select("*").single();
  if (error) return c.json({ error: error.message }, 400);
  return c.json({ course: data });
});

admin.post("/courses/:id/modules", async (c) => {
  const body = z.object({ title: z.string().min(1), sort_order: z.number().int().optional() }).parse(await c.req.json());
  const { data, error } = await adminDb
    .from("modules")
    .insert({ course_id: c.req.param("id"), title: body.title, sort_order: body.sort_order ?? 0 })
    .select("*")
    .single();
  if (error) return c.json({ error: error.message }, 400);
  return c.json({ module: data });
});

admin.post("/modules/:id/lessons", async (c) => {
  const body = z
    .object({
      title: z.string().min(1),
      type: z.enum(["video", "article", "quiz"]),
      article_content: z.string().optional(),
      duration_seconds: z.number().int().optional(),
      sort_order: z.number().int().optional(),
      is_preview: z.boolean().optional(),
    })
    .parse(await c.req.json());
  const { data, error } = await adminDb
    .from("lessons")
    .insert({
      module_id: c.req.param("id"),
      title: body.title,
      type: body.type,
      article_content: body.article_content ?? null,
      duration_seconds: body.duration_seconds ?? 0,
      sort_order: body.sort_order ?? 0,
      is_preview: body.is_preview ?? false,
    })
    .select("*")
    .single();
  if (error) return c.json({ error: error.message }, 400);
  return c.json({ lesson: data });
});

admin.get("/courses/:id/tree", async (c) => {
  const { data: course } = await adminDb.from("courses").select("*").eq("id", c.req.param("id")).single();
  if (!course) return c.json({ error: "Not found" }, 404);
  const { data: modules } = await adminDb.from("modules").select("*").eq("course_id", course.id).order("sort_order");
  const ids = (modules ?? []).map((m) => m.id);
  const { data: lessons } = ids.length
    ? await adminDb.from("lessons").select("*").in("module_id", ids).order("sort_order")
    : { data: [] as never[] };
  const lessonIds = (lessons ?? []).map((l) => l.id);
  const { data: media } = lessonIds.length
    ? await adminDb.from("media_assets").select("*").in("lesson_id", lessonIds)
    : { data: [] as never[] };
  return c.json({ course, modules: modules ?? [], lessons: lessons ?? [], media: media ?? [] });
});

admin.post("/lessons/:id/upload-url", async (c) => {
  const body = z.object({ contentType: z.string(), fileName: z.string() }).parse(await c.req.json());
  const lessonId = c.req.param("id");
  const ext = body.fileName.split(".").pop() || "mp4";
  const key = `originals/${lessonId}/${nanoid()}.${ext}`;
  const url = await presignPut(key, body.contentType);
  await adminDb.from("media_assets").upsert(
    { lesson_id: lessonId, original_key: key, status: "uploaded", content_type: body.contentType },
    { onConflict: "lesson_id" },
  );
  return c.json({ url, key });
});

admin.post("/lessons/:id/transcode", async (c) => {
  const lessonId = c.req.param("id");
  const { data: asset } = await adminDb.from("media_assets").select("*").eq("lesson_id", lessonId).single();
  if (!asset) return c.json({ error: "Upload a video first" }, 400);
  await adminDb.from("media_assets").update({ status: "processing" }).eq("id", asset.id);
  await transcodeQueue().add("transcode", {
    assetId: asset.id,
    lessonId,
    originalKey: asset.original_key,
  });
  return c.json({ ok: true });
});

admin.get("/users", async (c) => {
  const { data } = await adminDb.from("profiles").select("*").order("created_at", { ascending: false }).limit(200);
  return c.json({ users: data ?? [] });
});

admin.get("/organizations", async (c) => {
  const { data } = await adminDb.from("organizations").select("*").order("created_at", { ascending: false });
  return c.json({ organizations: data ?? [] });
});

admin.get("/orders", async (c) => {
  const { data } = await adminDb.from("orders").select("*").order("created_at", { ascending: false }).limit(200);
  return c.json({ orders: data ?? [] });
});

admin.get("/invoices", async (c) => {
  const { data } = await adminDb.from("invoices").select("*").order("issued_at", { ascending: false }).limit(200);
  return c.json({ invoices: data ?? [] });
});

admin.get("/instructors", async (c) => {
  const { data: profiles } = await adminDb.from("instructor_profiles").select("*");
  const { data: users } = await adminDb.from("profiles").select("*").eq("role", "instructor");
  const { data: links } = await adminDb.from("course_instructors").select("*");
  return c.json({ profiles: profiles ?? [], users: users ?? [], assignments: links ?? [] });
});

admin.post("/instructors", async (c) => {
  const body = z
    .object({
      userId: z.string().uuid(),
      headline: z.string().optional(),
      bio: z.string().optional(),
      slug: z.string().optional(),
    })
    .parse(await c.req.json());
  const { data: user } = await adminDb.from("profiles").select("*").eq("id", body.userId).single();
  if (!user) return c.json({ error: "User not found" }, 404);
  await adminDb.from("profiles").update({ role: "instructor", organization_id: null }).eq("id", body.userId);
  const slug =
    body.slug ||
    `${(user.full_name || user.email).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${body.userId.slice(0, 6)}`;
  const { data, error } = await adminDb
    .from("instructor_profiles")
    .upsert({
      user_id: body.userId,
      slug,
      headline: body.headline ?? "WORKIZ instructor",
      bio: body.bio ?? null,
      public_visible: true,
    })
    .select("*")
    .single();
  if (error) return c.json({ error: error.message }, 400);
  return c.json({ instructor: data });
});

admin.post("/courses/:id/instructors", async (c) => {
  const { userId, title } = z
    .object({ userId: z.string().uuid(), title: z.string().optional() })
    .parse(await c.req.json());
  const { data, error } = await adminDb
    .from("course_instructors")
    .upsert({ course_id: c.req.param("id"), user_id: userId, title: title ?? "Instructor" })
    .select("*")
    .single();
  if (error) return c.json({ error: error.message }, 400);
  return c.json({ assignment: data });
});

admin.delete("/courses/:id/instructors/:userId", async (c) => {
  await adminDb
    .from("course_instructors")
    .delete()
    .eq("course_id", c.req.param("id"))
    .eq("user_id", c.req.param("userId"));
  return c.json({ ok: true });
});
