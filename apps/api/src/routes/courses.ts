import { Hono } from "hono";
import { z } from "zod";
import { gatesForUser } from "../lib/course-gate.js";
import { maybeIssueCertificate } from "../lib/issue-certificate.js";
import { addSecondsSpent } from "../lib/time-spent.js";
import { adminDb } from "../lib/db.js";
import { hasCourseAccess } from "../lib/access.js";
import { getBearer, type Authed } from "../lib/auth.js";

export const courses = new Hono<{ Variables: { auth?: Authed } }>();

courses.get("/", async (c) => {
  const { data, error } = await adminDb
    .from("courses")
    .select("*")
    .eq("published", true)
    .order("created_at", { ascending: false });
  if (error) return c.json({ error: error.message }, 500);
  return c.json({ courses: data ?? [] });
});

courses.get("/:slug", async (c) => {
  const slug = c.req.param("slug");
  const { data: course, error } = await adminDb.from("courses").select("*").eq("slug", slug).maybeSingle();
  if (error) return c.json({ error: error.message }, 500);
  if (!course) return c.json({ error: "Not found" }, 404);

  let unlocked = false;
  let waitingOn: { title: string; slug: string } | null = null;
  const token = await getBearer(c);
  if (token) {
    const { data: userData } = await adminDb.auth.getUser(token);
    if (userData.user) {
      const { data: profile } = await adminDb.from("profiles").select("*").eq("id", userData.user.id).single();
      if (profile) {
        unlocked = await hasCourseAccess(profile, course.id);
        if (!unlocked) waitingOn = (await gatesForUser(profile, [course.id]))[course.id] ?? null;
      }
    }
  }
  if (!course.published && !unlocked) return c.json({ error: "Not found" }, 404);

  const { data: modules } = await adminDb
    .from("modules")
    .select("*")
    .eq("course_id", course.id)
    .order("sort_order");
  const moduleIds = (modules ?? []).map((m) => m.id);
  const { data: lessons } = moduleIds.length
    ? await adminDb.from("lessons").select("*").in("module_id", moduleIds).order("sort_order")
    : { data: [] as never[] };

  const safeLessons = (lessons ?? []).map((lesson) => ({
    ...lesson,
    article_content: unlocked || lesson.is_preview ? lesson.article_content : null,
  }));
  const lessonIds = (lessons ?? []).map((l) => l.id);
  const { data: resourceRows } = lessonIds.length
    ? await adminDb
        .from("lesson_resources")
        .select("id, lesson_id, title, content_type, byte_size, sort_order")
        .in("lesson_id", lessonIds)
        .order("sort_order")
    : { data: [] as never[] };
  const resources = (resourceRows ?? []).filter((r) => {
    const lesson = (lessons ?? []).find((l) => l.id === r.lesson_id);
    return lesson && (unlocked || lesson.is_preview);
  });
  const { data: links } = await adminDb.from("course_instructors").select("*").eq("course_id", course.id);
  const instructorIds = (links ?? []).map((l) => l.user_id);
  const { data: people } = instructorIds.length
    ? await adminDb.from("profiles").select("id, full_name, avatar_url").in("id", instructorIds)
    : { data: [] as never[] };
  const { data: bios } = instructorIds.length
    ? await adminDb.from("instructor_profiles").select("user_id, slug, headline").in("user_id", instructorIds)
    : { data: [] as never[] };
  const instructors = (links ?? []).map((l) => ({
    ...l,
    user: (people ?? []).find((p) => p.id === l.user_id) ?? null,
    profile: (bios ?? []).find((b) => b.user_id === l.user_id) ?? null,
  }));
  return c.json({
    course,
    modules: modules ?? [],
    lessons: safeLessons,
    resources,
    unlocked,
    waitingOn,
    instructors,
  });
});

const progressSchema = z.object({
  lessonId: z.string().uuid(),
  positionSeconds: z.number().int().min(0).optional(),
  spentSeconds: z.number().int().min(0).max(60).optional(),
  completed: z.boolean().optional(),
});

courses.post("/:slug/progress", async (c) => {
  const token = await getBearer(c);
  if (!token) return c.json({ error: "Unauthorized" }, 401);
  const { data: userData } = await adminDb.auth.getUser(token);
  if (!userData.user) return c.json({ error: "Unauthorized" }, 401);
  const { data: profile } = await adminDb.from("profiles").select("*").eq("id", userData.user.id).single();
  if (!profile) return c.json({ error: "Unauthorized" }, 401);
  const auth = { userId: userData.user.id, email: userData.user.email ?? profile.email, profile };
  const parsed = progressSchema.safeParse(await c.req.json());
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

  const { data: course } = await adminDb.from("courses").select("id, title").eq("slug", c.req.param("slug")).single();
  if (!course) return c.json({ error: "Not found" }, 404);
  if (!(await hasCourseAccess(auth.profile, course.id))) {
    return c.json({ error: "No access" }, 403);
  }

  const { data: existingProgress } = await adminDb
    .from("lesson_progress")
    .select("completed")
    .eq("user_id", auth.userId)
    .eq("lesson_id", parsed.data.lessonId)
    .maybeSingle();
  const progressRow: {
    user_id: string;
    lesson_id: string;
    position_seconds?: number;
    completed?: boolean;
    completed_at?: string;
  } = {
    user_id: auth.userId,
    lesson_id: parsed.data.lessonId,
  };
  if (parsed.data.positionSeconds != null) progressRow.position_seconds = parsed.data.positionSeconds;
  else if (!existingProgress) progressRow.position_seconds = 0;
  if (parsed.data.completed === true) {
    progressRow.completed = true;
    progressRow.completed_at = new Date().toISOString();
  } else if (!existingProgress) {
    progressRow.completed = false;
  }
  await adminDb.from("lesson_progress").upsert(progressRow);
  if (parsed.data.spentSeconds) await addSecondsSpent(auth.userId, parsed.data.lessonId, parsed.data.spentSeconds);

  if (parsed.data.completed) {
    await maybeIssueCertificate(auth.userId, course.id);
  }
  return c.json({ ok: true });
});
