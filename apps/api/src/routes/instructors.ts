import { Hono } from "hono";
import { z } from "zod";
import { adminDb } from "../lib/db.js";
import { requireRole, type Authed } from "../lib/auth.js";

export const publicInstructors = new Hono();

publicInstructors.get("/", async (c) => {
  const { data: profiles } = await adminDb
    .from("instructor_profiles")
    .select("*")
    .eq("public_visible", true);
  const ids = (profiles ?? []).map((p) => p.user_id);
  const { data: users } = ids.length
    ? await adminDb.from("profiles").select("id, full_name, avatar_url, email").in("id", ids)
    : { data: [] as never[] };
  const { data: links } = ids.length
    ? await adminDb.from("course_instructors").select("course_id, user_id").in("user_id", ids)
    : { data: [] as never[] };
  const courseIds = [...new Set((links ?? []).map((l) => l.course_id))];
  const { data: courses } = courseIds.length
    ? await adminDb.from("courses").select("id, slug, title, published").in("id", courseIds)
    : { data: [] as never[] };
  const published = new Set((courses ?? []).filter((c) => c.published).map((c) => c.id));
  const instructors = (profiles ?? []).map((p) => ({
    ...p,
    user: (users ?? []).find((u) => u.id === p.user_id) ?? null,
    courses: (links ?? [])
      .filter((l) => l.user_id === p.user_id && published.has(l.course_id))
      .map((l) => (courses ?? []).find((c) => c.id === l.course_id))
      .filter(Boolean),
  }));
  return c.json({ instructors });
});

publicInstructors.get("/:slug", async (c) => {
  const { data: profile } = await adminDb
    .from("instructor_profiles")
    .select("*")
    .eq("slug", c.req.param("slug"))
    .eq("public_visible", true)
    .maybeSingle();
  if (!profile) return c.json({ error: "Not found" }, 404);
  const { data: user } = await adminDb
    .from("profiles")
    .select("id, full_name, avatar_url")
    .eq("id", profile.user_id)
    .single();
  const { data: links } = await adminDb.from("course_instructors").select("*").eq("user_id", profile.user_id);
  const ids = (links ?? []).map((l) => l.course_id);
  const { data: courses } = ids.length
    ? await adminDb.from("courses").select("*").in("id", ids).eq("published", true)
    : { data: [] as never[] };
  return c.json({ instructor: { ...profile, user }, courses: courses ?? [] });
});

export const instructor = new Hono<{ Variables: { auth: Authed } }>();
instructor.use("*", requireRole("instructor", "super_admin"));

instructor.get("/profile", async (c) => {
  const auth = c.get("auth");
  const { data } = await adminDb.from("instructor_profiles").select("*").eq("user_id", auth.userId).maybeSingle();
  return c.json({ profile: data });
});

instructor.patch("/profile", async (c) => {
  const auth = c.get("auth");
  const body = z
    .object({
      headline: z.string().max(160).optional(),
      bio: z.string().max(4000).nullable().optional(),
      public_visible: z.boolean().optional(),
    })
    .parse(await c.req.json());
  const { data, error } = await adminDb
    .from("instructor_profiles")
    .update(body)
    .eq("user_id", auth.userId)
    .select("*")
    .maybeSingle();
  if (error) return c.json({ error: error.message }, 400);
  if (!data) return c.json({ error: "Instructor profile missing" }, 404);
  return c.json({ profile: data });
});

instructor.get("/courses", async (c) => {
  const auth = c.get("auth");
  const { data: links } = await adminDb.from("course_instructors").select("*").eq("user_id", auth.userId);
  const ids = (links ?? []).map((l) => l.course_id);
  const { data: courses } = ids.length ? await adminDb.from("courses").select("*").in("id", ids) : { data: [] as never[] };
  return c.json({ courses: courses ?? [], assignments: links ?? [] });
});

instructor.get("/courses/:id/students", async (c) => {
  const auth = c.get("auth");
  const courseId = c.req.param("id");
  if (auth.profile.role !== "super_admin") {
    const { data: assigned } = await adminDb
      .from("course_instructors")
      .select("course_id")
      .eq("course_id", courseId)
      .eq("user_id", auth.userId)
      .maybeSingle();
    if (!assigned) return c.json({ error: "Forbidden" }, 403);
  }
  const { data: enrollments } = await adminDb.from("enrollments").select("*").eq("course_id", courseId);
  const userIds = (enrollments ?? []).map((e) => e.user_id);
  const { data: people } = userIds.length
    ? await adminDb.from("profiles").select("id, full_name, email, role").in("id", userIds)
    : { data: [] as never[] };
  const { data: modules } = await adminDb.from("modules").select("id").eq("course_id", courseId);
  const moduleIds = (modules ?? []).map((m) => m.id);
  const { data: lessons } = moduleIds.length
    ? await adminDb.from("lessons").select("id").in("module_id", moduleIds)
    : { data: [] as never[] };
  const lessonIds = (lessons ?? []).map((l) => l.id);
  const { data: progress } = lessonIds.length
    ? await adminDb.from("lesson_progress").select("user_id, completed").in("lesson_id", lessonIds)
    : { data: [] as never[] };
  const total = lessonIds.length || 1;
  const students = (people ?? []).map((p) => {
    const completedLessons = (progress ?? []).filter((x) => x.user_id === p.id && x.completed).length;
    return {
      ...p,
      source: (enrollments ?? []).find((e) => e.user_id === p.id)?.source,
      completion: Math.round((completedLessons / total) * 100),
      finished: completedLessons >= total,
    };
  });
  return c.json({ students });
});
