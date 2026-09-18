import { Hono } from "hono";
import { z } from "zod";
import { adminDb } from "../lib/db.js";
import { hasCourseAccess } from "../lib/access.js";
import type { Authed } from "../lib/auth.js";

export const quizzes = new Hono<{ Variables: { auth: Authed } }>();

quizzes.get("/:id", async (c) => {
  const auth = c.get("auth");
  const { data: quiz } = await adminDb.from("quizzes").select("*").eq("id", c.req.param("id")).single();
  if (!quiz) return c.json({ error: "Not found" }, 404);
  const { data: lesson } = await adminDb.from("lessons").select("id, module_id").eq("id", quiz.lesson_id).single();
  const { data: module } = lesson
    ? await adminDb.from("modules").select("course_id").eq("id", lesson.module_id).single()
    : { data: null };
  if (!module || !(await hasCourseAccess(auth.profile, module.course_id))) {
    return c.json({ error: "No access" }, 403);
  }
  const { data: questions } = await adminDb
    .from("quiz_questions")
    .select("*")
    .eq("quiz_id", quiz.id)
    .order("sort_order");
  const qids = (questions ?? []).map((q) => q.id);
  const { data: options } = qids.length
    ? await adminDb.from("quiz_options").select("id, question_id, label").in("question_id", qids)
    : { data: [] as never[] };
  return c.json({ quiz, questions: questions ?? [], options: options ?? [] });
});

quizzes.post("/:id/attempt", async (c) => {
  const auth = c.get("auth");
  const answers = z.record(z.string().uuid()).parse((await c.req.json()).answers ?? {});
  const quizId = c.req.param("id");
  const { data: quiz } = await adminDb.from("quizzes").select("*").eq("id", quizId).single();
  if (!quiz) return c.json({ error: "Not found" }, 404);

  const { data: questions } = await adminDb.from("quiz_questions").select("*").eq("quiz_id", quizId);
  const qids = (questions ?? []).map((q) => q.id);
  const { data: options } = qids.length
    ? await adminDb.from("quiz_options").select("*").in("question_id", qids)
    : { data: [] as never[] };
  const correct = new Map<string, string>();
  for (const opt of options ?? []) {
    if (opt.is_correct) correct.set(opt.question_id, opt.id);
  }
  let right = 0;
  for (const q of questions ?? []) {
    if (answers[q.id] && answers[q.id] === correct.get(q.id)) right += 1;
  }
  const total = questions?.length || 1;
  const score = Math.round((right / total) * 100);
  const passed = score >= quiz.passing_score;
  await adminDb.from("quiz_attempts").insert({
    user_id: auth.userId,
    quiz_id: quizId,
    score,
    passed,
    answers,
  });
  if (passed && quiz.lesson_id) {
    await adminDb.from("lesson_progress").upsert({
      user_id: auth.userId,
      lesson_id: quiz.lesson_id,
      completed: true,
      completed_at: new Date().toISOString(),
      position_seconds: 0,
    });
  }
  return c.json({ score, passed, passingScore: quiz.passing_score });
});

quizzes.post("/lessons/:lessonId", async (c) => {
  const auth = c.get("auth");
  if (auth.profile.role !== "super_admin") return c.json({ error: "Forbidden" }, 403);
  const body = z
    .object({
      title: z.string(),
      passing_score: z.number().int().min(1).max(100).default(70),
      questions: z.array(
        z.object({
          prompt: z.string(),
          options: z.array(z.object({ label: z.string(), is_correct: z.boolean() })).min(2),
        }),
      ),
    })
    .parse(await c.req.json());

  const { data: quiz, error } = await adminDb
    .from("quizzes")
    .insert({ lesson_id: c.req.param("lessonId"), title: body.title, passing_score: body.passing_score })
    .select("*")
    .single();
  if (error || !quiz) return c.json({ error: error?.message ?? "Quiz failed" }, 400);
  await adminDb.from("lessons").update({ quiz_id: quiz.id, type: "quiz" }).eq("id", c.req.param("lessonId"));

  for (const [i, q] of body.questions.entries()) {
    const { data: question } = await adminDb
      .from("quiz_questions")
      .insert({ quiz_id: quiz.id, prompt: q.prompt, sort_order: i })
      .select("*")
      .single();
    if (!question) continue;
    await adminDb.from("quiz_options").insert(
      q.options.map((opt) => ({ question_id: question.id, label: opt.label, is_correct: opt.is_correct })),
    );
  }
  return c.json({ quiz });
});
