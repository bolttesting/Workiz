import { Hono } from "hono";
import { z } from "zod";
import { nanoid } from "nanoid";
import { requireRole, type Authed } from "../lib/auth.js";
import { adminDb } from "../lib/db.js";
import { presignPut, s3Configured } from "../lib/s3.js";
import { storeMediaFile, hostingerConfigured, type MediaFolder } from "../lib/media-store.js";
import { transcodeQueue } from "../lib/queue.js";
import { ensureInvoiceForOrder } from "../lib/access.js";
import { isUuid, readPage, readSearch } from "../lib/pagination.js";
import { loadInvoiceForPdf } from "../lib/invoice-pdf.js";
import { listSeatPlans, updateSeatPlan } from "../lib/plans.js";
import { getPlatformSettings, platformSettingGaps, savePlatformSettings } from "../lib/platform-settings.js";
import { readReminderStatus } from "../lib/reminder-status.js";
import { adminHomeSignals, enrichOrganizationBilling } from "../lib/billing.js";

async function barePublishedLessons() {
  const gaps: { courseId: string; courseTitle: string; lessonTitle: string }[] = [];
  const { data: published, error } = await adminDb.from("courses").select("id,title").eq("published", true).limit(40);
  if (error || !published?.length) return gaps;
  const { data: modules } = await adminDb
    .from("modules")
    .select("id,course_id")
    .in(
      "course_id",
      published.map((course) => course.id),
    );
  if (!modules?.length) return gaps;
  const moduleCourse = new Map(modules.map((module) => [module.id, module.course_id]));
  const { data: lessons } = await adminDb
    .from("lessons")
    .select("id,module_id,title,type,article_content")
    .in(
      "module_id",
      modules.map((module) => module.id),
    );
  const candidates = (lessons ?? []).filter((lesson) => lesson.type === "video" || lesson.type === "article");
  if (!candidates.length) return gaps;
  const lessonIds = candidates.map((lesson) => lesson.id);
  const withUrl = await adminDb.from("media_assets").select("lesson_id,status,public_url").in("lesson_id", lessonIds);
  const mediaRows = withUrl.error && /public_url/i.test(withUrl.error.message)
    ? (await adminDb.from("media_assets").select("lesson_id,status").in("lesson_id", lessonIds)).data
    : withUrl.error
      ? null
      : withUrl.data;
  if (!mediaRows) return gaps;
  const ready = new Set(
    mediaRows
      .filter((asset) => asset.status === "ready" || String("public_url" in asset ? asset.public_url : "").trim())
      .map((asset) => asset.lesson_id),
  );
  const { data: resources, error: resourceError } = await adminDb
    .from("lesson_resources")
    .select("lesson_id")
    .in("lesson_id", lessonIds);
  const withHandout = new Set(resourceError ? [] : (resources ?? []).map((row) => row.lesson_id));
  const courseTitle = new Map(published.map((course) => [course.id, course.title]));
  for (const lesson of candidates) {
    if (gaps.length >= 5) break;
    const handout = withHandout.has(lesson.id);
    const hasVideo = ready.has(lesson.id);
    const articleText = String(lesson.article_content ?? "")
      .replace(/<[^>]+>/g, " ")
      .trim();
    const bare = lesson.type === "video" ? !hasVideo && !handout : !articleText && !handout && !hasVideo;
    if (!bare) continue;
    const courseId = moduleCourse.get(lesson.module_id);
    if (!courseId) continue;
    gaps.push({
      courseId: String(courseId),
      courseTitle: courseTitle.get(courseId) || "Course",
      lessonTitle: lesson.title || "Lesson",
    });
  }
  return gaps;
}

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
    { count: unansweredQuestions },
    { count: pendingOrders },
  ] = await Promise.all([
    adminDb.from("profiles").select("*", { count: "exact", head: true }),
    adminDb.from("organizations").select("*", { count: "exact", head: true }),
    adminDb.from("courses").select("*", { count: "exact", head: true }),
    adminDb.from("courses").select("*", { count: "exact", head: true }).eq("published", true),
    adminDb.from("quizzes").select("*", { count: "exact", head: true }),
    adminDb.from("orders").select("*", { count: "exact", head: true }).eq("status", "paid"),
    adminDb.from("organizations").select("id,name,seat_used,seat_limit,status,created_at"),
    adminDb
      .from("orders")
      .select("id,kind,status,amount_cents,currency,created_at,user_id,course_id")
      .eq("status", "paid")
      .order("created_at", { ascending: false })
      .limit(500),
    adminDb
      .from("courses")
      .select("id,title,slug,published,price_cents,currency,created_at")
      .order("created_at", { ascending: false })
      .limit(8),
    adminDb.from("course_questions").select("id", { count: "exact", head: true }).is("answer_body", null),
    adminDb.from("orders").select("id", { count: "exact", head: true }).eq("status", "pending"),
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

  const monthKey = monthKeys[monthKeys.length - 1] || "";
  const monthOrders = (paidOrders ?? []).filter((order) => {
    const created = order.created_at ? new Date(order.created_at) : null;
    if (!created || Number.isNaN(created.getTime())) return false;
    const key = `${created.getUTCFullYear()}-${String(created.getUTCMonth() + 1).padStart(2, "0")}`;
    return key === monthKey;
  });
  const sourceCourseIds = [...new Set(monthOrders.map((order) => order.course_id).filter((id): id is string => Boolean(id)))];
  const titleById = new Map<string, string>();
  if (sourceCourseIds.length) {
    const { data: titled } = await adminDb.from("courses").select("id,title").in("id", sourceCourseIds);
    for (const course of titled ?? []) titleById.set(course.id, course.title);
  }
  const sourceMap = new Map<string, number>();
  for (const order of monthOrders) {
    const label =
      order.kind === "seats"
        ? "Company seats"
        : titleById.get(order.course_id || "") || (order.kind === "course" ? "Course" : "Order");
    sourceMap.set(label, (sourceMap.get(label) ?? 0) + (order.amount_cents ?? 0));
  }
  const monthSources = [...sourceMap.entries()]
    .map(([label, amountCents]) => ({ label, amountCents }))
    .sort((a, b) => b.amountCents - a.amountCents)
    .slice(0, 6);

  const year = now.getUTCFullYear();
  const monthIndex = now.getUTCMonth();
  const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const revenueByDay = Array.from({ length: daysInMonth }, (_, index) => ({
    day: `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(index + 1).padStart(2, "0")}`,
    revenueCents: 0,
  }));
  const dayIndex = new Map(revenueByDay.map((row, index) => [row.day, index]));
  for (const order of monthOrders) {
    const day = String(order.created_at).slice(0, 10);
    const index = dayIndex.get(day);
    if (index === undefined) continue;
    revenueByDay[index]!.revenueCents += order.amount_cents ?? 0;
  }

  const recent = (paidOrders ?? []).slice(0, 8);
  const invoiceByOrder = new Map<string, { id: string; number: string }>();
  if (recent.length) {
    const { data: invoiceRows } = await adminDb
      .from("invoices")
      .select("id, order_id, number")
      .in(
        "order_id",
        recent.map((order) => order.id),
      );
    for (const row of invoiceRows ?? []) {
      if (row.order_id && row.id) invoiceByOrder.set(String(row.order_id), { id: String(row.id), number: String(row.number ?? "") });
    }
    const latest = recent[0];
    if (latest && !invoiceByOrder.has(latest.id)) {
      try {
        const created = await ensureInvoiceForOrder({
          id: latest.id,
          status: "paid",
          amount_cents: latest.amount_cents ?? 0,
          currency: latest.currency || "aed",
        });
        if (created?.id) invoiceByOrder.set(latest.id, { id: String(created.id), number: String(created.number ?? "") });
      } catch {
        // The recent-orders row still opens the order when the invoice cannot be created.
      }
    }
  }

  const since = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const extras = await Promise.all([
    adminDb
      .from("orders")
      .select("id,kind,status,amount_cents,currency,created_at")
      .in("status", ["failed", "refunded"])
      .order("created_at", { ascending: false })
      .limit(5),
    adminDb.from("enrollments").select("user_id").limit(5000),
    adminDb
      .from("profiles")
      .select("id, full_name, email, role, created_at")
      .in("role", ["individual_learner", "company_learner", "company_admin"])
      .order("created_at", { ascending: false })
      .limit(200),
    barePublishedLessons().catch(() => [] as Awaited<ReturnType<typeof barePublishedLessons>>),
    listSeatPlans().catch(() => []),
    platformSettingGaps().catch(() => [] as Array<"issuer" | "email">),
  ]).catch(() => null);
  const problemOrders = extras?.[0].data ?? [];
  const enrollmentRows = extras?.[1].data ?? [];
  const learners = extras?.[2].data ?? [];
  const bareLessons = extras?.[3] ?? [];
  const plans = extras?.[4] ?? [];
  const settingGaps = extras?.[5] ?? [];

  const enrolled = new Set((enrollmentRows ?? []).map((row) => row.user_id));
  const paidUsers = new Set((paidOrders ?? []).map((order) => order.user_id).filter((id): id is string => Boolean(id)));
  const idleAll = (learners ?? []).filter((person) => person.id && !enrolled.has(person.id) && !paidUsers.has(person.id));
  const idlePeople = idleAll.slice(0, 5).map((person) => ({
      id: String(person.id),
      name: String(person.full_name || "").trim() || String(person.email || "Learner"),
      email: String(person.email || ""),
    }));
  const almostFull = (orgRows ?? [])
    .filter((org) => {
      const limit = Number(org.seat_limit ?? 0);
      const used = Number(org.seat_used ?? 0);
      return limit > 0 && used > 0 && limit - used <= 1;
    })
    .slice(0, 5)
    .map((org) => ({
      id: String(org.id),
      name: String(org.name || "Company"),
      open: Math.max(0, Number(org.seat_limit ?? 0) - Number(org.seat_used ?? 0)),
    }));
  const newNames = [
    ...(orgRows ?? [])
      .filter((org) => org.created_at && String(org.created_at) >= since)
      .map((org) => String(org.name || "").trim())
      .filter(Boolean),
    ...(learners ?? [])
      .filter((person) => person.created_at && String(person.created_at) >= since)
      .map((person) => String(person.full_name || "").trim() || String(person.email || "").trim())
      .filter(Boolean),
  ].slice(0, 6);
  const freePlans = plans
    .filter((plan) => plan.active && !plan.custom && plan.monthlyCents === 0)
    .slice(0, 5)
    .map((plan) => ({ id: plan.id, name: plan.name }));
  const mail = readReminderStatus();
  const mailFresh = mail ? Date.now() - new Date(mail.at).getTime() < 14 * 86_400_000 : false;
  const signals = await adminHomeSignals();

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
    revenueByDay,
    monthSources,
    recentOrders: recent.map((order) => {
      const invoice = invoiceByOrder.get(order.id);
      return {
        id: order.id,
        kind: order.kind,
        status: order.status,
        amount_cents: order.amount_cents,
        currency: order.currency,
        created_at: order.created_at,
        invoiceId: invoice?.id ?? null,
        invoiceNumber: invoice?.number ?? null,
      };
    }),
    recentCourses: recentCourses ?? [],
    unanswered: unansweredQuestions ?? 0,
    pendingOrders: pendingOrders ?? 0,
    problemOrders: problemOrders ?? [],
    idleCount: idleAll.length,
    idlePeople,
    almostFull,
    newNames,
    bareLessons,
    freePlans,
    settingGaps,
    mailNote: mail && !mail.ok && mailFresh ? "The Monday reminder email did not send." : null,
    ...signals,
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
  currency: z.string().default("aed"),
  published: z.boolean().optional(),
  duration_minutes: z.number().int().nullish(),
  level: z.string().nullish(),
  learning_outcomes: z.array(z.string()).nullish(),
  audience: z.array(z.string()).nullish(),
  tags: z.array(z.string()).nullish(),
  certificate_months: z.number().int().min(0).max(120).nullish(),
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
  const payload = { ...parsed.data };
  if (payload.certificate_months === 0) payload.certificate_months = null;
  let { data, error } = await adminDb.from("courses").update(payload).eq("id", c.req.param("id")).select("*").single();
  if (error && /certificate_months/i.test(error.message)) {
    const { certificate_months: _months, ...rest } = payload;
    const retry = await adminDb.from("courses").update(rest).eq("id", c.req.param("id")).select("*").single();
    data = retry.data;
    error = retry.error;
  }
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

const USER_ROLES = ["super_admin", "instructor", "company_admin", "company_learner", "individual_learner"];

admin.get("/users", async (c) => {
  const paging = readPage(c);
  if (!paging) {
    const { data } = await adminDb.from("profiles").select("*").order("created_at", { ascending: false }).limit(200);
    return c.json({ users: data ?? [] });
  }
  const q = readSearch(c);
  const role = c.req.query("role");
  let query = adminDb.from("profiles").select("*", { count: "exact" });
  if (q) query = query.or(`full_name.ilike.%${q}%,email.ilike.%${q}%`);
  if (role && USER_ROLES.includes(role)) query = query.eq("role", role);
  const { data, count, error } = await query
    .order("created_at", { ascending: false })
    .range(paging.from, paging.to);
  if (error) return c.json({ error: error.message }, 400);
  return c.json({ users: data ?? [], total: count ?? 0, page: paging.page, pageSize: paging.pageSize });
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

admin.get("/organizations/learning", async (c) => {
  const { data: people } = await adminDb.from("profiles").select("id, organization_id").not("organization_id", "is", null);
  const members = (people ?? []).filter((person) => person.organization_id);
  const memberIds = members.map((person) => person.id);
  if (!memberIds.length) return c.json({ rows: [] as { organizationId: string; notStarted: number; finished: number }[] });

  const { data: enrollments } = await adminDb.from("enrollments").select("user_id, course_id").in("user_id", memberIds);
  const courseIds = Array.from(new Set((enrollments ?? []).map((row) => row.course_id)));
  const { data: modules } = courseIds.length
    ? await adminDb.from("modules").select("id, course_id").in("course_id", courseIds)
    : { data: [] as { id: string; course_id: string }[] };
  const moduleIds = (modules ?? []).map((mod) => mod.id);
  const { data: lessons } = moduleIds.length
    ? await adminDb.from("lessons").select("id, module_id").in("module_id", moduleIds)
    : { data: [] as { id: string; module_id: string }[] };
  const { data: progress } = await adminDb
    .from("lesson_progress")
    .select("user_id, lesson_id, completed")
    .in("user_id", memberIds)
    .eq("completed", true);

  const moduleCourse = new Map((modules ?? []).map((mod) => [mod.id, mod.course_id]));
  const courseOfLesson = new Map<string, string>();
  const lessonCount = new Map<string, number>();
  for (const lesson of lessons ?? []) {
    const courseId = moduleCourse.get(lesson.module_id);
    if (!courseId) continue;
    courseOfLesson.set(lesson.id, courseId);
    lessonCount.set(courseId, (lessonCount.get(courseId) ?? 0) + 1);
  }
  const doneCount = new Map<string, number>();
  const started = new Set<string>();
  for (const row of progress ?? []) {
    if (!row.completed) continue;
    started.add(row.user_id);
    const courseId = courseOfLesson.get(row.lesson_id);
    if (!courseId) continue;
    const key = `${row.user_id}:${courseId}`;
    doneCount.set(key, (doneCount.get(key) ?? 0) + 1);
  }
  const finishedByOrg = new Map<string, number>();
  const orgOfUser = new Map(members.map((person) => [person.id, person.organization_id as string]));
  for (const enrollment of enrollments ?? []) {
    const total = lessonCount.get(enrollment.course_id) ?? 0;
    const done = doneCount.get(`${enrollment.user_id}:${enrollment.course_id}`) ?? 0;
    if (total > 0 && done >= total) {
      const orgId = orgOfUser.get(enrollment.user_id);
      if (orgId) finishedByOrg.set(orgId, (finishedByOrg.get(orgId) ?? 0) + 1);
    }
  }
  const notStartedByOrg = new Map<string, number>();
  for (const person of members) {
    if (started.has(person.id)) continue;
    const orgId = person.organization_id as string;
    notStartedByOrg.set(orgId, (notStartedByOrg.get(orgId) ?? 0) + 1);
  }
  const orgIds = new Set<string>([...notStartedByOrg.keys(), ...finishedByOrg.keys()]);
  return c.json({
    rows: Array.from(orgIds).map((organizationId) => ({
      organizationId,
      notStarted: notStartedByOrg.get(organizationId) ?? 0,
      finished: finishedByOrg.get(organizationId) ?? 0,
    })),
  });
});

admin.get("/organizations", async (c) => {
  const { data } = await adminDb.from("organizations").select("*").order("created_at", { ascending: false });
  const organizations = await enrichOrganizationBilling(data ?? []);
  return c.json({ organizations });
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

const ORDER_SELECT = "*, user:profiles(full_name,email), organization:organizations(name), course:courses(title)";
const ORDER_STATUSES = ["pending", "paid", "failed", "refunded"];
const ORDER_KINDS = ["course", "seats"];

/** Order ids or customer ids matching free text: an order id, or a customer's name / email / company. */
async function orderCustomerFilter(q: string): Promise<string | null> {
  if (isUuid(q)) return `id.eq.${q},user_id.eq.${q},organization_id.eq.${q}`;
  const [{ data: people }, { data: orgs }] = await Promise.all([
    adminDb.from("profiles").select("id").or(`full_name.ilike.%${q}%,email.ilike.%${q}%`).limit(200),
    adminDb.from("organizations").select("id").ilike("name", `%${q}%`).limit(200),
  ]);
  const parts: string[] = [];
  if (people?.length) parts.push(`user_id.in.(${people.map((p) => p.id).join(",")})`);
  if (orgs?.length) parts.push(`organization_id.in.(${orgs.map((o) => o.id).join(",")})`);
  return parts.length ? parts.join(",") : null;
}

admin.get("/orders", async (c) => {
  const paging = readPage(c);
  if (!paging) {
    const { data } = await adminDb.from("orders").select(ORDER_SELECT).order("created_at", { ascending: false }).limit(200);
    return c.json({ orders: data ?? [] });
  }
  const q = readSearch(c);
  const status = c.req.query("status");
  const kind = c.req.query("kind");
  const empty = { orders: [], total: 0, page: paging.page, pageSize: paging.pageSize };
  let query = adminDb.from("orders").select(ORDER_SELECT, { count: "exact" });
  if (q) {
    const filter = await orderCustomerFilter(q);
    if (!filter) return c.json(empty);
    query = query.or(filter);
  }
  if (status && ORDER_STATUSES.includes(status)) query = query.eq("status", status);
  if (kind && ORDER_KINDS.includes(kind)) query = query.eq("kind", kind);
  const { data, count, error } = await query
    .order("created_at", { ascending: false })
    .range(paging.from, paging.to);
  if (error) return c.json({ error: error.message }, 400);
  return c.json({ orders: data ?? [], total: count ?? 0, page: paging.page, pageSize: paging.pageSize });
});

admin.get("/invoices", async (c) => {
  const { data: paid } = await adminDb
    .from("orders")
    .select("*")
    .eq("status", "paid")
    .order("created_at", { ascending: false })
    .limit(200);
  const paidIds = (paid ?? []).map((order) => order.id);
  const { data: invoiced } = paidIds.length
    ? await adminDb.from("invoices").select("order_id").in("order_id", paidIds)
    : { data: [] as { order_id: string }[] };
  const hasInvoice = new Set((invoiced ?? []).map((row) => row.order_id));
  for (const order of paid ?? []) {
    if (!hasInvoice.has(order.id)) await ensureInvoiceForOrder(order);
  }

  const paging = readPage(c);
  if (!paging) {
    const { data } = await adminDb.from("invoices").select("*").order("issued_at", { ascending: false }).limit(200);
    return c.json({ invoices: data ?? [] });
  }
  const q = readSearch(c);
  let query = adminDb
    .from("invoices")
    .select("*, order:orders(kind, user:profiles(full_name,email), organization:organizations(name))", {
      count: "exact",
    });
  if (q) query = query.ilike("number", `%${q}%`);
  const { data, count, error } = await query
    .order("issued_at", { ascending: false })
    .range(paging.from, paging.to);
  if (error) return c.json({ error: error.message }, 400);
  return c.json({ invoices: data ?? [], total: count ?? 0, page: paging.page, pageSize: paging.pageSize });
});

admin.get("/invoices/:id/pdf", async (c) => {
  const loaded = await loadInvoiceForPdf(c.req.param("id"));
  if (!loaded) return c.json({ error: "Not found" }, 404);
  const filename = `${loaded.invoice.number}.pdf`;
  return c.body(new Uint8Array(loaded.buffer), 200, {
    "Content-Type": "application/pdf",
    "Content-Disposition": `attachment; filename="${filename}"`,
  });
});

admin.get("/settings", async (c) => {
  const settings = await getPlatformSettings();
  return c.json({
    settings,
    emailConfigured: Boolean(process.env.RESEND_API_KEY?.trim()),
    currency: "AED",
  });
});

const phoneField = z
  .string()
  .trim()
  .max(40)
  .refine((value) => value === "" || value.replace(/\D/g, "").length >= 7, "Enter a full phone number, or leave it blank.");

admin.patch("/settings", async (c) => {
  const parsed = z
    .object({
      quizPassMark: z.number().int().min(1).max(100).optional(),
      dueSoonDays: z.number().int().min(1).max(60).optional(),
      inviteDays: z.number().int().min(1).max(30).optional(),
      certificateIssuer: z.string().trim().min(1).max(80).optional(),
      whatsapp: phoneField.optional(),
      phone: phoneField.optional(),
      emails: z.array(z.string().trim().email("Enter a valid email.").max(120)).max(8).optional(),
      address: z.string().trim().max(300).optional(),
    })
    .safeParse(await c.req.json());
  if (!parsed.success) {
    return c.json({ error: parsed.error.issues[0]?.message || "Check the settings and try again." }, 400);
  }
  const settings = await savePlatformSettings(parsed.data);
  return c.json({ settings });
});

admin.get("/plans", async (c) => {
  return c.json({ plans: await listSeatPlans() });
});

admin.patch("/plans/:id", async (c) => {
  const body = z
    .object({
      name: z.string().min(2).optional(),
      blurb: z.string().optional(),
      seats: z.number().int().min(1).max(10000).optional(),
      monthlyCents: z.number().int().min(0).optional(),
      pricePerSeatCents: z.number().int().min(0).nullable().optional(),
      minSeats: z.number().int().min(1).nullable().optional(),
      maxSeats: z.number().int().min(1).nullable().optional(),
      features: z.array(z.string()).optional(),
      popular: z.boolean().optional(),
    })
    .parse(await c.req.json());
  try {
    const plan = await updateSeatPlan(c.req.param("id"), body);
    if (!plan) return c.json({ error: "Package not found" }, 404);
    return c.json({ plan });
  } catch (err) {
    return c.json({ error: (err as Error).message }, 400);
  }
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
  const { count: unanswered } = await adminDb
    .from("course_questions")
    .select("id", { count: "exact", head: true })
    .is("answer_body", null);
  return c.json({
    unanswered: unanswered ?? 0,
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
  const { data: asker } = await adminDb.from("profiles").select("email").eq("id", question.user_id).maybeSingle();
  const { data: course } = await adminDb.from("courses").select("title, slug").eq("id", question.course_id).maybeSingle();
  if (asker?.email && course?.slug) {
    const { questionAnsweredEmail, sendMail } = await import("../lib/mail.js");
    const { urls } = await import("../lib/auth.js");
    await sendMail({
      to: asker.email,
      subject: `Reply on ${course.title}`,
      html: questionAnsweredEmail({ course: course.title, href: `${urls().learn}/courses/${course.slug}` }),
    });
  }
  return c.json({ question: data });
});
