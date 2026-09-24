import { Hono } from "hono";
import { z } from "zod";
import { nanoid } from "nanoid";
import { requireRole, type Authed } from "../lib/auth.js";
import { adminDb } from "../lib/db.js";
import { presignPut, s3Configured } from "../lib/s3.js";
import { storeMediaFile, hostingerConfigured, type MediaFolder } from "../lib/media-store.js";
import { transcodeQueue } from "../lib/queue.js";

export const admin = new Hono<{ Variables: { auth: Authed } }>();
admin.use("*", requireRole("super_admin"));
admin.get("/stats", async (c) => {
  const [
    { count: users },
    { count: orgs },
    { count: courses },
    { count: publishedCourses },
    { count: quizzes },
    { count: orders },
    { data: orgRows },
    { data: paidOrders },
    { data: recentCourses },
  ] = await Promise.all([
    adminDb.from("profiles").select("*", { count: "exact", head: true }),
    adminDb.from("organizations").select("*", { count: "exact", head: true }),
    adminDb.from("courses").select("*", { count: "exact", head: true }),
    adminDb.from("courses").select("*", { count: "exact", head: true }).eq("published", true),
    adminDb.from("quizzes").select("*", { count: "exact", head: true }),
    adminDb.from("orders").select("*", { count: "exact", head: true }).eq("status", "paid"),
    adminDb.from("organizations").select("seat_used,seat_limit"),
    adminDb
      .from("orders")
      .select("id,kind,status,amount_cents,currency,created_at,user_id")
      .eq("status", "paid")
      .order("created_at", { ascending: false })
      .limit(500),
    adminDb
      .from("courses")
      .select("id,title,slug,published,price_cents,currency,created_at")
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  const seatsUsed = (orgRows ?? []).reduce((sum, row) => sum + (row.seat_used ?? 0), 0);
  const seatsLimit = (orgRows ?? []).reduce((sum, row) => sum + (row.seat_limit ?? 0), 0);
  const revenueCents = (paidOrders ?? []).reduce((sum, row) => sum + (row.amount_cents ?? 0), 0);

  const monthKeys: string[] = [];
  const now = new Date();
  for (let i = 11; i >= 0; i -= 1) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    monthKeys.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`);
  }
  const byMonth = new Map(monthKeys.map((month) => [month, { month, revenueCents: 0, orders: 0 }]));
  for (const order of paidOrders ?? []) {
    const created = order.created_at ? new Date(order.created_at) : null;
    if (!created || Number.isNaN(created.getTime())) continue;
    const key = `${created.getUTCFullYear()}-${String(created.getUTCMonth() + 1).padStart(2, "0")}`;
    const bucket = byMonth.get(key);
    if (!bucket) continue;
    bucket.revenueCents += order.amount_cents ?? 0;
    bucket.orders += 1;
  }

  return c.json({
    users: users ?? 0,
    orgs: orgs ?? 0,
    courses: courses ?? 0,
    publishedCourses: publishedCourses ?? 0,
    quizzes: quizzes ?? 0,
    orders: orders ?? 0,
    seatsUsed,
    seatsLimit,
    revenueCents,
    revenueByMonth: monthKeys.map((month) => byMonth.get(month)!),
    recentOrders: (paidOrders ?? []).slice(0, 8),
    recentCourses: recentCourses ?? [],
  });
});

const courseSchema = z.object({
  title: z.string().min(3),
  slug: z.string().min(3),
  subtitle: z.string().nullish(),
  description: z.string().nullish(),
  thumbnail_url: z.string().nullish(),
  cover_video_url: z.string().nullish(),
  price_cents: z.number().int().min(0),
  currency: z.string().default("usd"),
  published: z.boolean().optional(),
  duration_minutes: z.number().int().nullish(),
  level: z.string().nullish(),
  learning_outcomes: z.array(z.string()).nullish(),
  audience: z.array(z.string()).nullish(),
  tags: z.array(z.string()).nullish(),
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

admin.patch("/lessons/:id", async (c) => {
  const body = z
    .object({
      title: z.string().min(1).optional(),
      article_content: z.string().optional().nullable(),
      duration_seconds: z.number().int().optional(),
      is_preview: z.boolean().optional(),
      sort_order: z.number().int().optional(),
    })
    .parse(await c.req.json());
  const { data, error } = await adminDb
    .from("lessons")
    .update(body)
    .eq("id", c.req.param("id"))
    .select("*")
    .single();
  if (error) return c.json({ error: error.message }, 400);
  return c.json({ lesson: data });
});

admin.delete("/lessons/:id", async (c) => {
  const { error } = await adminDb.from("lessons").delete().eq("id", c.req.param("id"));
  if (error) return c.json({ error: error.message }, 400);
  return c.json({ ok: true });
});

admin.delete("/modules/:id", async (c) => {
  const { error } = await adminDb.from("modules").delete().eq("id", c.req.param("id"));
  if (error) return c.json({ error: error.message }, 400);
  return c.json({ ok: true });
});

admin.post("/assets/upload-url", async (c) => {
  return c.json(
    {
      error:
        "Use POST /admin/assets/upload (multipart). Hostinger media does not use client-side presigned URLs.",
    },
    400,
  );
});

/** Direct upload. Hostinger first; S3 when configured later. */
admin.post("/assets/upload", async (c) => {
  const form = await c.req.parseBody({ all: true });
  const file = form["file"];
  const folderRaw = typeof form["folder"] === "string" ? form["folder"] : "misc";
  const folderParse = z.enum(["courses", "blog", "lessons", "videos", "misc"]).safeParse(folderRaw);
  const folder = (folderParse.success ? folderParse.data : "misc") as MediaFolder;

  if (!file || typeof file === "string") {
    return c.json({ error: "file is required" }, 400);
  }

  const blob = file as File;
  const fileName = blob.name || "upload.bin";
  const contentType = blob.type || "application/octet-stream";
  const bytes = Buffer.from(await blob.arrayBuffer());

  try {
    const stored = await storeMediaFile({ bytes, folder, fileName, contentType });
    return c.json({
      key: stored.key,
      publicUrl: stored.publicUrl,
      driver: stored.driver,
      byteSize: stored.byteSize,
    });
  } catch (err) {
    return c.json({ error: (err as Error).message }, 503);
  }
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
  const { data: resources } = lessonIds.length
    ? await adminDb.from("lesson_resources").select("*").in("lesson_id", lessonIds).order("sort_order")
    : { data: [] as never[] };
  return c.json({
    course,
    modules: modules ?? [],
    lessons: lessons ?? [],
    media: media ?? [],
    resources: resources ?? [],
  });
});

admin.post("/lessons/:id/resources", async (c) => {
  const lessonId = c.req.param("id");
  const body = z
    .object({
      title: z.string().min(1).max(200),
      file_key: z.string().min(1),
      file_url: z.string().optional().nullable(),
      content_type: z.string().default("application/pdf"),
      byte_size: z.number().int().optional().nullable(),
    })
    .parse(await c.req.json());
  const { count } = await adminDb
    .from("lesson_resources")
    .select("*", { count: "exact", head: true })
    .eq("lesson_id", lessonId);
  const { data, error } = await adminDb
    .from("lesson_resources")
    .insert({
      lesson_id: lessonId,
      title: body.title,
      file_key: body.file_key,
      file_url: body.file_url ?? null,
      content_type: body.content_type,
      byte_size: body.byte_size ?? null,
      sort_order: count ?? 0,
    })
    .select("*")
    .single();
  if (error) return c.json({ error: error.message }, 400);
  return c.json({ resource: data });
});

admin.delete("/resources/:id", async (c) => {
  const { error } = await adminDb.from("lesson_resources").delete().eq("id", c.req.param("id"));
  if (error) return c.json({ error: error.message }, 400);
  return c.json({ ok: true });
});

/** Lecture video upload — Hostinger direct MP4 (no HLS until S3). */
admin.post("/lessons/:id/video", async (c) => {
  const lessonId = c.req.param("id");
  const form = await c.req.parseBody({ all: true });
  const file = form["file"];
  if (!file || typeof file === "string") {
    return c.json({ error: "file is required" }, 400);
  }
  const blob = file as File;
  const fileName = blob.name || "lecture.mp4";
  const contentType = blob.type || "video/mp4";
  const bytes = Buffer.from(await blob.arrayBuffer());

  try {
    const stored = await storeMediaFile({
      bytes,
      folder: "videos",
      fileName,
      contentType,
    });
    const row = {
      lesson_id: lessonId,
      original_key: stored.key,
      public_url: stored.publicUrl,
      status: "ready" as const,
      content_type: stored.contentType,
      byte_size: stored.byteSize,
      hls_prefix: null,
      error_message: null,
    };
    const { data, error } = await adminDb
      .from("media_assets")
      .upsert(row, { onConflict: "lesson_id" })
      .select("*")
      .single();
    if (error) return c.json({ error: error.message }, 400);
    return c.json({ asset: data, publicUrl: stored.publicUrl, driver: stored.driver });
  } catch (err) {
    return c.json({ error: (err as Error).message }, 503);
  }
});

/** Legacy S3 presign path — only when S3 is configured for future HLS. */
admin.post("/lessons/:id/upload-url", async (c) => {
  if (hostingerConfigured() && !s3Configured()) {
    return c.json(
      {
        error: "Use POST /admin/lessons/:id/video for Hostinger uploads.",
      },
      400,
    );
  }
  if (!s3Configured()) {
    return c.json(
      {
        error: "Configure MEDIA_UPLOAD_URL (Hostinger) or S3 credentials for video uploads.",
      },
      503,
    );
  }
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
  if (asset.public_url && !s3Configured()) {
    await adminDb.from("media_assets").update({ status: "ready" }).eq("id", asset.id);
    return c.json({ ok: true, skipped: true, reason: "Direct Hostinger MP4 — no HLS transcode" });
  }
  if (!s3Configured()) {
    return c.json({ error: "Transcoding requires S3. Hostinger videos play as MP4 without transcode." }, 400);
  }
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

admin.patch("/users/:id", async (c) => {
  const body = z
    .object({
      role: z
        .enum([
          "super_admin",
          "instructor",
          "company_admin",
          "company_learner",
          "individual_learner",
        ])
        .optional(),
      organization_id: z.string().uuid().nullish(),
    })
    .parse(await c.req.json());
  if (Object.keys(body).length === 0) return c.json({ error: "No changes" }, 400);
  const { data, error } = await adminDb
    .from("profiles")
    .update(body)
    .eq("id", c.req.param("id"))
    .select("*")
    .single();
  if (error) return c.json({ error: error.message }, 400);
  return c.json({ user: data });
});

admin.get("/organizations", async (c) => {
  const { data } = await adminDb.from("organizations").select("*").order("created_at", { ascending: false });
  return c.json({ organizations: data ?? [] });
});

/** Create a company for offline / bank-transfer seat deals (no Stripe required). */
admin.post("/organizations", async (c) => {
  const body = z
    .object({
      name: z.string().min(2).max(200),
      billing_email: z.string().email().optional().nullable(),
      seat_limit: z.number().int().min(1).max(10000),
      status: z.enum(["incomplete", "active", "past_due", "canceled"]).default("active"),
      adminUserId: z.string().uuid().optional().nullable(),
      notes: z.string().max(500).optional().nullable(),
    })
    .parse(await c.req.json());

  const { data: org, error } = await adminDb
    .from("organizations")
    .insert({
      name: body.name.trim(),
      billing_email: body.billing_email?.toLowerCase() ?? null,
      seat_limit: body.seat_limit,
      seat_used: 0,
      status: body.status,
    })
    .select("*")
    .single();
  if (error || !org) return c.json({ error: error?.message || "Could not create company" }, 400);

  let adminProfile: unknown = null;
  if (body.adminUserId) {
    const { data: user, error: userErr } = await adminDb
      .from("profiles")
      .update({
        role: "company_admin",
        organization_id: org.id,
      })
      .eq("id", body.adminUserId)
      .select("*")
      .single();
    if (userErr) return c.json({ error: userErr.message, organization: org }, 400);
    adminProfile = user;
  }

  await adminDb.from("orders").insert({
    user_id: body.adminUserId ?? null,
    organization_id: org.id,
    kind: "seats",
    seat_quantity: body.seat_limit,
    amount_cents: 0,
    currency: "aed",
    status: "paid",
  });

  return c.json({ organization: org, admin: adminProfile });
});

admin.patch("/organizations/:id", async (c) => {
  const body = z
    .object({
      seat_limit: z.number().int().min(0).optional(),
      status: z.enum(["incomplete", "active", "past_due", "canceled"]).optional(),
      name: z.string().min(2).optional(),
      billing_email: z.string().email().nullish(),
      adminUserId: z.string().uuid().optional().nullable(),
    })
    .parse(await c.req.json());

  const { adminUserId, ...orgPatch } = body;
  if (Object.keys(orgPatch).length === 0 && !adminUserId) {
    return c.json({ error: "No changes" }, 400);
  }

  let org = null as Record<string, unknown> | null;
  if (Object.keys(orgPatch).length) {
    const { data, error } = await adminDb
      .from("organizations")
      .update(orgPatch)
      .eq("id", c.req.param("id"))
      .select("*")
      .single();
    if (error) return c.json({ error: error.message }, 400);
    org = data;
  } else {
    const { data } = await adminDb.from("organizations").select("*").eq("id", c.req.param("id")).single();
    org = data;
  }
  if (!org) return c.json({ error: "Not found" }, 404);

  if (adminUserId) {
    const { error: userErr } = await adminDb
      .from("profiles")
      .update({ role: "company_admin", organization_id: org.id as string })
      .eq("id", adminUserId);
    if (userErr) return c.json({ error: userErr.message, organization: org }, 400);
  }

  return c.json({ organization: org });
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

admin.get("/questions", async (c) => {
  const unansweredOnly = c.req.query("unanswered") === "1";
  let query = adminDb
    .from("course_questions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
  if (unansweredOnly) query = query.is("answer_body", null);
  const { data, error } = await query;
  if (error) return c.json({ error: error.message }, 500);
  const rows = data ?? [];
  const courseIds = [...new Set(rows.map((r) => r.course_id))];
  const userIds = [
    ...new Set(rows.flatMap((r) => [r.user_id, r.answered_by].filter(Boolean) as string[])),
  ];
  const { data: courseRows } = courseIds.length
    ? await adminDb.from("courses").select("id, title, slug").in("id", courseIds)
    : { data: [] as never[] };
  const { data: people } = userIds.length
    ? await adminDb.from("profiles").select("id, full_name, email, avatar_url").in("id", userIds)
    : { data: [] as never[] };
  const courseMap = new Map((courseRows ?? []).map((row) => [row.id, row]));
  const peopleMap = new Map((people ?? []).map((p) => [p.id, p]));
  return c.json({
    questions: rows.map((q) => ({
      ...q,
      course: courseMap.get(q.course_id) ?? null,
      user: peopleMap.get(q.user_id) ?? null,
      answerer: q.answered_by ? peopleMap.get(q.answered_by) ?? null : null,
    })),
  });
});

admin.post("/questions/:id/answer", async (c) => {
  const auth = c.get("auth");
  const body = z.object({ answer_body: z.string().trim().min(2).max(4000) }).parse(await c.req.json());
  const { data: question } = await adminDb
    .from("course_questions")
    .select("*")
    .eq("id", c.req.param("id"))
    .maybeSingle();
  if (!question) return c.json({ error: "Not found" }, 404);
  const { data, error } = await adminDb
    .from("course_questions")
    .update({
      answer_body: body.answer_body,
      answered_by: auth.userId,
      answered_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", question.id)
    .select("*")
    .single();
  if (error) return c.json({ error: error.message }, 400);
  return c.json({ question: data });
});
