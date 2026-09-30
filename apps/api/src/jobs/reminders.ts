import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { urls } from "../lib/auth.js";
import { adminDb } from "../lib/db.js";
import { enrollmentDues, isDueDate } from "../lib/due-dates.js";
import { adminReminderEmail, learnerReminderEmail, sendMail } from "../lib/mail.js";
import { getPlatformSettings } from "../lib/platform-settings.js";

const sentFile = join(dirname(fileURLToPath(import.meta.url)), "../../data/reminder-sent.json");

type Sent = Record<string, string>;

function readSent(): Sent {
  try {
    const parsed = JSON.parse(readFileSync(sentFile, "utf8")) as { keys?: Sent };
    return parsed.keys && typeof parsed.keys === "object" ? parsed.keys : {};
  } catch {
    return {};
  }
}

function writeSent(keys: Sent) {
  mkdirSync(dirname(sentFile), { recursive: true });
  const cutoff = Date.now() - 90 * 86_400_000;
  const fresh: Sent = {};
  for (const [key, at] of Object.entries(keys)) {
    const time = new Date(at).getTime();
    if (!Number.isNaN(time) && time >= cutoff) fresh[key] = at;
  }
  writeFileSync(sentFile, JSON.stringify({ keys: fresh }, null, 2));
}

function dubaiDate() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Dubai" });
}

type OpenRow = {
  userId: string;
  courseId: string;
  due: string;
  mark: "overdue" | "due_soon";
};

export async function sendDueReminders() {
  const platform = await getPlatformSettings();
  const { data: enrollments, error } = await adminDb.from("enrollments").select("user_id, course_id, due_at");
  let pairs: { user_id: string; course_id: string; due: string | null }[] = [];
  if (error && /due_at/i.test(error.message)) {
    const { data: rows } = await adminDb.from("enrollments").select("user_id, course_id");
    const dues = await enrollmentDues(
      (rows ?? []).map((row) => ({ user_id: String(row.user_id), course_id: String(row.course_id) })),
    );
    pairs = (rows ?? []).map((row) => ({
      user_id: String(row.user_id),
      course_id: String(row.course_id),
      due: dues[`${row.user_id}:${row.course_id}`] ?? null,
    }));
  } else if (error) {
    throw new Error(error.message);
  } else {
    pairs = (enrollments ?? []).map((row) => ({
      user_id: String(row.user_id),
      course_id: String(row.course_id),
      due: row.due_at ? String(row.due_at).slice(0, 10) : null,
    }));
  }

  const flagged: OpenRow[] = [];
  for (const row of pairs) {
    if (!row.due || !isDueDate(row.due)) continue;
    const due = new Date(`${row.due}T23:59:59`);
    if (Number.isNaN(due.getTime())) continue;
    const late = Date.now() > due.getTime();
    const days = (due.getTime() - Date.now()) / 86_400_000;
    if (!late && days > platform.dueSoonDays) continue;
    flagged.push({
      userId: row.user_id,
      courseId: row.course_id,
      due: row.due,
      mark: late ? "overdue" : "due_soon",
    });
  }
  if (!flagged.length) return { learners: 0, admins: 0 };

  const courseIds = Array.from(new Set(flagged.map((row) => row.courseId)));
  const userIds = Array.from(new Set(flagged.map((row) => row.userId)));
  const { data: modules } = await adminDb.from("modules").select("id, course_id").in("course_id", courseIds);
  const moduleIds = (modules ?? []).map((module) => module.id);
  const courseOfModule = new Map((modules ?? []).map((module) => [String(module.id), String(module.course_id)]));
  const { data: lessons } = moduleIds.length
    ? await adminDb.from("lessons").select("id, module_id").in("module_id", moduleIds)
    : { data: [] as { id: string; module_id: string }[] };
  const lessonsByCourse = new Map<string, string[]>();
  for (const lesson of lessons ?? []) {
    const courseId = courseOfModule.get(String(lesson.module_id));
    if (!courseId) continue;
    const list = lessonsByCourse.get(courseId) ?? [];
    list.push(String(lesson.id));
    lessonsByCourse.set(courseId, list);
  }
  const lessonIds = (lessons ?? []).map((lesson) => String(lesson.id));
  const { data: progress } = lessonIds.length
    ? await adminDb
        .from("lesson_progress")
        .select("user_id, lesson_id, completed")
        .in("user_id", userIds)
        .in("lesson_id", lessonIds)
    : { data: [] as { user_id: string; lesson_id: string; completed: boolean }[] };
  const done = new Set(
    (progress ?? []).filter((row) => row.completed).map((row) => `${row.user_id}:${row.lesson_id}`),
  );
  const open = flagged.filter((row) => {
    const ids = lessonsByCourse.get(row.courseId) ?? [];
    if (!ids.length) return false;
    return ids.some((id) => !done.has(`${row.userId}:${id}`));
  });
  if (!open.length) return { learners: 0, admins: 0 };

  const { data: courses } = await adminDb.from("courses").select("id, title, slug").in("id", courseIds);
  const courseById = new Map((courses ?? []).map((course) => [String(course.id), course]));
  const { data: profiles } = await adminDb
    .from("profiles")
    .select("id, email, full_name, organization_id, role")
    .in("id", userIds);
  const profileById = new Map((profiles ?? []).map((profile) => [String(profile.id), profile]));
  const sent = readSent();
  const learn = urls().learn;
  let learners = 0;

  for (const row of open) {
    const profile = profileById.get(row.userId);
    const course = courseById.get(row.courseId);
    if (!profile?.email || !course) continue;
    const key = `${row.userId}:${row.courseId}:${row.due}:${row.mark}`;
    if (sent[key]) continue;
    const mail = await sendMail({
      to: profile.email,
      subject: row.mark === "overdue" ? `${course.title} is overdue` : `${course.title} is due soon`,
      html: learnerReminderEmail({
        course: course.title,
        dueAt: row.due,
        overdue: row.mark === "overdue",
        href: `${learn}/courses/${course.slug}`,
      }),
    });
    if (!mail.sent) continue;
    sent[key] = new Date().toISOString();
    learners += 1;
  }

  const orgIds = Array.from(
    new Set((profiles ?? []).map((profile) => profile.organization_id).filter((id): id is string => Boolean(id))),
  );
  let admins = 0;
  if (orgIds.length) {
    const { data: orgAdmins } = await adminDb
      .from("profiles")
      .select("email, organization_id, role")
      .in("organization_id", orgIds)
      .eq("role", "company_admin");
    const { data: organizations } = await adminDb.from("organizations").select("id, name").in("id", orgIds);
    const orgName = new Map((organizations ?? []).map((org) => [String(org.id), String(org.name)]));
    const today = dubaiDate();
    for (const orgId of orgIds) {
      const personIds = new Set(
        (profiles ?? []).filter((profile) => profile.organization_id === orgId).map((profile) => String(profile.id)),
      );
      const rows = open.filter((row) => personIds.has(row.userId));
      if (!rows.length) continue;
      const lines = rows.slice(0, 12).map((row) => {
        const person = profileById.get(row.userId);
        const course = courseById.get(row.courseId);
        const name = person?.full_name?.trim() || person?.email || "Learner";
        const when = row.mark === "overdue" ? "overdue" : "due soon";
        return `${name} — ${course?.title ?? "Course"} — ${when} ${row.due}`;
      });
      const extra = rows.length - lines.length;
      if (extra > 0) lines.push(`${extra} more on the team page.`);
      const targets = (orgAdmins ?? []).filter((admin) => admin.organization_id === orgId && admin.email);
      for (const admin of targets) {
        const digestKey = `org:${orgId}:${admin.email}:${today}`;
        if (sent[digestKey]) continue;
        const mail = await sendMail({
          to: admin.email,
          subject: `${orgName.get(orgId) ?? "Your company"} training dates`,
          html: adminReminderEmail({
            company: orgName.get(orgId) ?? "your company",
            lines,
            href: `${learn}/team`,
          }),
        });
        if (!mail.sent) continue;
        sent[digestKey] = today;
        admins += 1;
      }
    }
  }

  writeSent(sent);
  return { learners, admins };
}
