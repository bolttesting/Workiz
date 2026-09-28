import { adminDb } from "./db.js";
import { listCourseSets } from "./course-sets.js";

type Person = { id: string; organization_id: string | null };

async function finishedCourseIds(userId: string, courseIds: string[]) {
  const done = new Set<string>();
  if (!courseIds.length) return done;
  const { data: modules } = await adminDb.from("modules").select("id, course_id").in("course_id", courseIds);
  const moduleCourse = new Map((modules ?? []).map((mod) => [mod.id as string, mod.course_id as string]));
  const moduleIds = (modules ?? []).map((mod) => mod.id as string);
  const { data: lessons } = moduleIds.length
    ? await adminDb.from("lessons").select("id, module_id").in("module_id", moduleIds)
    : { data: [] as { id: string; module_id: string }[] };
  const lessonCourse = new Map<string, string>();
  const totals = new Map<string, number>();
  for (const lesson of lessons ?? []) {
    const courseId = moduleCourse.get(lesson.module_id);
    if (!courseId) continue;
    lessonCourse.set(lesson.id, courseId);
    totals.set(courseId, (totals.get(courseId) ?? 0) + 1);
  }
  const lessonIds = (lessons ?? []).map((lesson) => lesson.id);
  const { data: progress } = lessonIds.length
    ? await adminDb.from("lesson_progress").select("lesson_id, completed").eq("user_id", userId).in("lesson_id", lessonIds)
    : { data: [] as { lesson_id: string; completed: boolean }[] };
  const completed = new Map<string, number>();
  for (const row of progress ?? []) {
    if (!row.completed) continue;
    const courseId = lessonCourse.get(row.lesson_id);
    if (!courseId) continue;
    completed.set(courseId, (completed.get(courseId) ?? 0) + 1);
  }
  for (const courseId of courseIds) {
    const total = totals.get(courseId) ?? 0;
    if (total === 0 || (completed.get(courseId) ?? 0) >= total) done.add(courseId);
  }
  return done;
}

export async function gatesForUser(profile: Person, courseIds: string[]) {
  const gates: Record<string, { title: string; slug: string } | null> = {};
  for (const id of courseIds) gates[id] = null;
  if (!profile.organization_id || !courseIds.length) return gates;

  const { data: enrollments } = await adminDb
    .from("enrollments")
    .select("course_id, source")
    .eq("user_id", profile.id)
    .in("course_id", courseIds);
  const seat = new Set((enrollments ?? []).filter((row) => row.source === "seat").map((row) => row.course_id as string));
  const sets = (await listCourseSets(profile.organization_id)).filter((set) => set.ordered);
  const needed = new Set<string>();
  for (const set of sets) {
    set.courseIds.forEach((_id, index) => {
      const previous = set.courseIds[index - 1];
      if (index > 0 && previous) needed.add(previous);
    });
  }
  const finished = await finishedCourseIds(profile.id, Array.from(needed));
  const titlesNeeded = Array.from(new Set(sets.flatMap((set) => set.courseIds)));
  const { data: courses } = titlesNeeded.length
    ? await adminDb.from("courses").select("id, title, slug").in("id", titlesNeeded)
    : { data: [] as { id: string; title: string; slug: string }[] };
  const byId = new Map((courses ?? []).map((course) => [course.id, course]));

  for (const courseId of courseIds) {
    if (!seat.has(courseId)) continue;
    for (const set of sets) {
      const index = set.courseIds.indexOf(courseId);
      if (index <= 0) continue;
      const previousId = set.courseIds[index - 1];
      if (!previousId || finished.has(previousId)) continue;
      const previous = byId.get(previousId);
      if (previous) gates[courseId] = { title: previous.title, slug: previous.slug };
      break;
    }
  }
  return gates;
}
