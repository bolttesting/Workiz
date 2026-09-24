import { Hono } from "hono";
import { z } from "zod";
import { adminDb } from "../lib/db.js";
import { canModerateCourse, hasCourseAccess } from "../lib/access.js";
import { requireUser, type Authed } from "../lib/auth.js";

async function courseBySlug(slug: string | undefined) {
  if (!slug) return null;
  const { data } = await adminDb.from("courses").select("id, slug, title, published").eq("slug", slug).maybeSingle();
  return data;
}

async function attachPeople<T extends { user_id: string }>(rows: T[]) {
  const ids = [...new Set(rows.map((r) => r.user_id))];
  const answerIds = [
    ...new Set(
      rows
        .map((r) => ("answered_by" in r ? (r as { answered_by?: string | null }).answered_by : null))
        .filter(Boolean) as string[],
    ),
  ];
  const allIds = [...new Set([...ids, ...answerIds])];
  const { data: people } = allIds.length
    ? await adminDb.from("profiles").select("id, full_name, avatar_url, role").in("id", allIds)
    : { data: [] as never[] };
  const map = new Map((people ?? []).map((p) => [p.id, p]));
  return rows.map((row) => ({
    ...row,
    user: map.get(row.user_id) ?? null,
    answerer:
      "answered_by" in row && (row as { answered_by?: string | null }).answered_by
        ? map.get((row as { answered_by: string }).answered_by) ?? null
        : null,
  }));
}

export const courseEngagement = new Hono<{ Variables: { auth?: Authed } }>();

courseEngagement.get("/:slug/reviews", async (c) => {
  const slug = c.req.param("slug");
  const course = await courseBySlug(slug);
  if (!course || !course.published) return c.json({ error: "Not found" }, 404);
  const { data, error } = await adminDb
    .from("course_reviews")
    .select("*")
    .eq("course_id", course.id)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) return c.json({ error: error.message }, 500);
  const reviews = await attachPeople(data ?? []);
  const avg =
    reviews.length > 0 ? reviews.reduce((sum, r) => sum + (r.rating ?? 0), 0) / reviews.length : 0;
  return c.json({
    reviews,
    summary: { count: reviews.length, average: Number(avg.toFixed(1)) },
  });
});

courseEngagement.post("/:slug/reviews", requireUser, async (c) => {
  const auth = c.get("auth") as Authed;
  const slug = c.req.param("slug");
  const course = await courseBySlug(slug);
  if (!course || !course.published) return c.json({ error: "Not found" }, 404);
  if (!(await hasCourseAccess(auth.profile, course.id))) {
    return c.json({ error: "Buy or enroll in this course before leaving a review." }, 403);
  }
  const body = z
    .object({
      rating: z.number().int().min(1).max(5),
      body: z.string().trim().min(8).max(2000),
    })
    .parse(await c.req.json());

  const { data, error } = await adminDb
    .from("course_reviews")
    .upsert(
      {
        course_id: course.id,
        user_id: auth.userId,
        rating: body.rating,
        body: body.body,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "course_id,user_id" },
    )
    .select("*")
    .single();
  if (error) return c.json({ error: error.message }, 400);
  return c.json({ review: data });
});

courseEngagement.get("/:slug/questions", async (c) => {
  const slug = c.req.param("slug");
  const course = await courseBySlug(slug);
  if (!course || !course.published) return c.json({ error: "Not found" }, 404);

  const { data, error } = await adminDb
    .from("course_questions")
    .select("*")
    .eq("course_id", course.id)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) return c.json({ error: error.message }, 500);
  return c.json({ questions: await attachPeople(data ?? []) });
});

courseEngagement.post("/:slug/questions", requireUser, async (c) => {
  const auth = c.get("auth") as Authed;
  const slug = c.req.param("slug");
  const course = await courseBySlug(slug);
  if (!course || !course.published) return c.json({ error: "Not found" }, 404);
  if (!(await hasCourseAccess(auth.profile, course.id))) {
    return c.json({ error: "Buy or enroll in this course before asking a question." }, 403);
  }
  const body = z.object({ body: z.string().trim().min(8).max(2000) }).parse(await c.req.json());
  const { data, error } = await adminDb
    .from("course_questions")
    .insert({ course_id: course.id, user_id: auth.userId, body: body.body })
    .select("*")
    .single();
  if (error) return c.json({ error: error.message }, 400);
  return c.json({ question: data });
});

/** Answer a question — admin or assigned instructor. */
courseEngagement.post("/questions/:id/answer", requireUser, async (c) => {
  const auth = c.get("auth") as Authed;
  const { data: question } = await adminDb
    .from("course_questions")
    .select("*")
    .eq("id", c.req.param("id"))
    .maybeSingle();
  if (!question) return c.json({ error: "Not found" }, 404);
  if (!(await canModerateCourse(auth.profile, question.course_id))) {
    return c.json({ error: "Forbidden" }, 403);
  }
  const body = z.object({ answer_body: z.string().trim().min(2).max(4000) }).parse(await c.req.json());
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
