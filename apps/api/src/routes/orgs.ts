import { Hono } from "hono";
import { z } from "zod";
import { nanoid } from "nanoid";
import { adminDb } from "../lib/db.js";
import { sendMail } from "../lib/mail.js";
import { courseIdsForInvites, enrollInviteCourses, setInviteCourseIds } from "../lib/invite-courses.js";
import { inviteDepartments, memberDepartments, setInviteDepartment, setMemberDepartment } from "../lib/departments.js";
import { createCourseSet, deleteCourseSet, getCourseSet, listCourseSets, setCourseSetOrdered } from "../lib/course-sets.js";
import { ensureCertificateNumber } from "../lib/certificate-code.js";
import { enrollmentDues, isDueDate, setEnrollmentDue, setInviteCourseDue } from "../lib/due-dates.js";
import { logActivity, listActivity } from "../lib/activity.js";
import { secondsForUsers } from "../lib/time-spent.js";
import { getOrgNote, setOrgNote } from "../lib/org-note.js";
import { leadFlags, setDepartmentLead } from "../lib/leads.js";
import { getPlatformSettings } from "../lib/platform-settings.js";
import { urls, type Authed } from "../lib/auth.js";

const dueField = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional();

function dueState(dueAt: string | null, finished: boolean, soonDays = 7) {
  if (!dueAt || !isDueDate(dueAt)) return "none";
  const due = new Date(`${dueAt}T23:59:59`);
  const late = Date.now() > due.getTime();
  if (finished) return late ? "late" : "on_time";
  if (late) return "overdue";
  const days = (due.getTime() - Date.now()) / 86_400_000;
  return days <= soonDays ? "due_soon" : "on_time";
}

export const orgs = new Hono<{ Variables: { auth: Authed } }>();

orgs.get("/me", async (c) => {
  const auth = c.get("auth");
  if (!auth.profile.organization_id) return c.json({ organization: null, members: [], invites: [] });
  const { data: organization } = await adminDb
    .from("organizations")
    .select("*")
    .eq("id", auth.profile.organization_id)
    .single();
  const { data: members } = await adminDb
    .from("profiles")
    .select("id, email, full_name, role, created_at")
    .eq("organization_id", auth.profile.organization_id);
  const isAdmin = auth.profile.role === "company_admin" || auth.profile.role === "super_admin";
  const { data: invites } = isAdmin
    ? await adminDb
        .from("invites")
        .select("id, email, status, created_at")
        .eq("organization_id", auth.profile.organization_id)
        .order("created_at", { ascending: false })
    : { data: [] as { id: string; email: string; status: string; created_at: string }[] };
  const memberIds = (members ?? []).map((member) => member.id);
  const { data: enrollments } = memberIds.length
    ? await adminDb.from("enrollments").select("user_id, course_id, source").in("user_id", memberIds)
    : { data: [] as { user_id: string; course_id: string; source: string }[] };
  const inviteRows = invites ?? [];
  const inviteCourseMap = await courseIdsForInvites(inviteRows.map((invite) => invite.id));
  const extraCourseIds = Object.values(inviteCourseMap).flat();
  const courseIds = Array.from(new Set([...(enrollments ?? []).map((row) => row.course_id), ...extraCourseIds]));
  const { data: courses } = courseIds.length
    ? await adminDb.from("courses").select("id, title").in("id", courseIds)
    : { data: [] as { id: string; title: string }[] };
  const titles = new Map((courses ?? []).map((course) => [course.id, course.title]));
  const departments = await memberDepartments((members ?? []).map((member) => member.id));
  const leads = await leadFlags((members ?? []).map((member) => member.id));
  const inviteDepartmentMap = await inviteDepartments(inviteRows.map((invite) => invite.id));
  const pendingInvites = inviteRows.filter((invite) => invite.status === "pending").length;
  const assignments = (enrollments ?? []).map((row) => ({
    user_id: row.user_id,
    course_id: row.course_id,
    source: row.source,
    title: titles.get(row.course_id) ?? "Course",
  }));
  const inviteAssignments = inviteRows.flatMap((invite) =>
    (inviteCourseMap[invite.id] ?? []).map((courseId) => ({
      invite_id: invite.id,
      course_id: courseId,
      title: titles.get(courseId) ?? "Course",
    })),
  );
  return c.json({
    organization,
    members: (members ?? []).map((member) => ({
      ...member,
      department: departments[member.id] ?? null,
      department_lead: leads[member.id] ?? false,
    })),
    invites: inviteRows.map((invite) => ({ ...invite, department: inviteDepartmentMap[invite.id] ?? null })),
    assignments,
    inviteAssignments,
    pendingInvites,
    seatsOpen: organization ? Math.max(0, organization.seat_limit - organization.seat_used - pendingInvites) : 0,
  });
});

orgs.post("/members/:id/courses", async (c) => {
  const auth = c.get("auth");
  if (auth.profile.role !== "company_admin" && auth.profile.role !== "super_admin") {
    return c.json({ error: "Forbidden" }, 403);
  }
  if (!auth.profile.organization_id) return c.json({ error: "No company" }, 400);
  const { courseId, dueAt } = z.object({ courseId: z.string().uuid(), dueAt: dueField }).parse(await c.req.json());
  const memberId = c.req.param("id");
  const { data: member } = await adminDb.from("profiles").select("*").eq("id", memberId).single();
  if (!member || member.organization_id !== auth.profile.organization_id) {
    return c.json({ error: "That person is not on your team" }, 404);
  }
  const { data: org } = await adminDb.from("organizations").select("status").eq("id", auth.profile.organization_id).single();
  if (!org || org.status !== "active") return c.json({ error: "Company billing is not active" }, 400);
  const { data: course } = await adminDb.from("courses").select("id, title, published").eq("id", courseId).maybeSingle();
  if (!course?.published) return c.json({ error: "Course unavailable" }, 404);

  const { data: existing } = await adminDb
    .from("enrollments")
    .select("id")
    .eq("user_id", memberId)
    .eq("course_id", courseId)
    .maybeSingle();
  if (!existing) {
    const { error } = await adminDb.from("enrollments").insert({
      user_id: memberId,
      course_id: courseId,
      source: "seat",
    });
    if (error) return c.json({ error: error.message }, 400);
  }
  if (dueAt) await setEnrollmentDue(memberId, courseId, dueAt);
  return c.json({ ok: true, title: course.title });
});

orgs.post("/assign", async (c) => {
  const auth = c.get("auth");
  if (auth.profile.role !== "company_admin" && auth.profile.role !== "super_admin") {
    return c.json({ error: "Forbidden" }, 403);
  }
  const orgId = auth.profile.organization_id;
  if (!orgId) return c.json({ error: "No company" }, 400);
  const body = z
    .object({
      courseId: z.string().uuid(),
      memberIds: z.array(z.string().uuid()).max(500).optional(),
      inviteIds: z.array(z.string().uuid()).max(500).optional(),
      department: z.string().trim().min(1).max(80).optional(),
      dueAt: dueField,
    })
    .parse(await c.req.json());

  const { data: org } = await adminDb.from("organizations").select("status").eq("id", orgId).single();
  if (!org || org.status !== "active") return c.json({ error: "Company billing is not active" }, 400);
  const { data: course } = await adminDb.from("courses").select("id, title, published").eq("id", body.courseId).maybeSingle();
  if (!course?.published) return c.json({ error: "Course unavailable" }, 404);

  const memberIds = new Set(body.memberIds ?? []);
  const inviteIds = new Set(body.inviteIds ?? []);
  if (body.department) {
    const { data: people } = await adminDb.from("profiles").select("id").eq("organization_id", orgId);
    const ids = (people ?? []).map((person) => person.id);
    const departments = await memberDepartments(ids);
    for (const id of ids) {
      if (departments[id]?.toLowerCase() === body.department.toLowerCase()) memberIds.add(id);
    }
    const { data: pending } = await adminDb
      .from("invites")
      .select("id")
      .eq("organization_id", orgId)
      .eq("status", "pending");
    const pendingIds = (pending ?? []).map((invite) => invite.id);
    const inviteDepartmentMap = await inviteDepartments(pendingIds);
    for (const id of pendingIds) {
      if (inviteDepartmentMap[id]?.toLowerCase() === body.department.toLowerCase()) inviteIds.add(id);
    }
  }
  if (memberIds.size === 0 && inviteIds.size === 0) {
    return c.json({ error: "Choose at least one person or a department that has people." }, 400);
  }

  let assigned = 0;
  for (const memberId of memberIds) {
    const { data: member } = await adminDb.from("profiles").select("organization_id").eq("id", memberId).maybeSingle();
    if (!member || member.organization_id !== orgId) continue;
    const { data: existing } = await adminDb
      .from("enrollments")
      .select("id")
      .eq("user_id", memberId)
      .eq("course_id", course.id)
      .maybeSingle();
    if (!existing) {
      const { error } = await adminDb.from("enrollments").insert({
        user_id: memberId,
        course_id: course.id,
        source: "seat",
      });
      if (error) return c.json({ error: error.message }, 400);
    }
    if (body.dueAt) await setEnrollmentDue(memberId, course.id, body.dueAt);
    assigned += 1;
  }
  for (const inviteId of inviteIds) {
    const { data: invite } = await adminDb.from("invites").select("id, organization_id, status").eq("id", inviteId).maybeSingle();
    if (!invite || invite.organization_id !== orgId || invite.status !== "pending") continue;
    const current = await courseIdsForInvites([invite.id]);
    await setInviteCourseIds(invite.id, [...(current[invite.id] ?? []), course.id]);
    if (body.dueAt) await setInviteCourseDue(invite.id, course.id, body.dueAt);
    assigned += 1;
  }
  await logActivity(orgId, auth.userId, "Assigned", `${course.title} · ${assigned} people`);
  return c.json({ ok: true, title: course.title, assigned });
});

orgs.post("/unassign", async (c) => {
  const auth = c.get("auth");
  if (auth.profile.role !== "company_admin" && auth.profile.role !== "super_admin") {
    return c.json({ error: "Forbidden" }, 403);
  }
  const orgId = auth.profile.organization_id;
  if (!orgId) return c.json({ error: "No company" }, 400);
  const body = z
    .object({
      courseId: z.string().uuid(),
      memberIds: z.array(z.string().uuid()).min(1).max(500),
    })
    .parse(await c.req.json());
  let removed = 0;
  let kept = 0;
  for (const memberId of body.memberIds) {
    const { data: member } = await adminDb.from("profiles").select("organization_id").eq("id", memberId).maybeSingle();
    if (!member || member.organization_id !== orgId) continue;
    const { data: enrollment } = await adminDb
      .from("enrollments")
      .select("id, source")
      .eq("user_id", memberId)
      .eq("course_id", body.courseId)
      .maybeSingle();
    if (!enrollment) continue;
    if (enrollment.source !== "seat") {
      kept += 1;
      continue;
    }
    const { error } = await adminDb.from("enrollments").delete().eq("id", enrollment.id);
    if (error) return c.json({ error: error.message }, 400);
    removed += 1;
  }
  await logActivity(orgId, auth.userId, "Unassigned", `${removed} seat enrollment${removed === 1 ? "" : "s"}`);
  return c.json({ ok: true, removed, kept });
});

orgs.patch("/members/:id", async (c) => {
  const auth = c.get("auth");
  if (auth.profile.role !== "company_admin" && auth.profile.role !== "super_admin") {
    return c.json({ error: "Forbidden" }, 403);
  }
  if (!auth.profile.organization_id) return c.json({ error: "No company" }, 400);
  const body = z
    .object({
      department: z.string().max(80).nullable().optional(),
      departmentLead: z.boolean().optional(),
    })
    .parse(await c.req.json());
  const memberId = c.req.param("id");
  const { data: member } = await adminDb.from("profiles").select("organization_id").eq("id", memberId).maybeSingle();
  if (!member || member.organization_id !== auth.profile.organization_id) {
    return c.json({ error: "That person is not on your team" }, 404);
  }
  let saved: string | null | undefined;
  if (body.department !== undefined) saved = await setMemberDepartment(memberId, body.department);
  let departmentLead: boolean | undefined;
  if (body.departmentLead !== undefined) {
    const department = saved !== undefined ? saved : (await memberDepartments([memberId]))[memberId];
    if (body.departmentLead && !department) {
      return c.json({ error: "Set a department before making this person a lead." }, 400);
    }
    departmentLead = await setDepartmentLead(memberId, body.departmentLead);
    await logActivity(auth.profile.organization_id, auth.userId, body.departmentLead ? "Department lead" : "Lead removed", memberId);
  }
  return c.json({ ok: true, department: saved, departmentLead });
});

orgs.get("/progress", async (c) => {
  const auth = c.get("auth");
  const lead = auth.profile.role === "company_learner" && Boolean((await leadFlags([auth.userId]))[auth.userId]);
  if (auth.profile.role !== "company_admin" && auth.profile.role !== "super_admin" && !lead) {
    return c.json({ error: "Forbidden" }, 403);
  }
  if (!auth.profile.organization_id) return c.json({ rows: [] });
  const platform = await getPlatformSettings();
  const { data: members } = await adminDb
    .from("profiles")
    .select("id, email, full_name")
    .eq("organization_id", auth.profile.organization_id);
  const people = members ?? [];
  const memberIds = people.map((member) => member.id);
  const departments = await memberDepartments(memberIds);
  const { data: enrollments } = memberIds.length
    ? await adminDb.from("enrollments").select("user_id, course_id").in("user_id", memberIds)
    : { data: [] as { user_id: string; course_id: string }[] };
  const courseIds = Array.from(new Set((enrollments ?? []).map((row) => row.course_id)));
  const { data: courseRows } = courseIds.length
    ? await adminDb.from("courses").select("id, title").in("id", courseIds)
    : { data: [] as { id: string; title: string }[] };
  const { data: modules } = courseIds.length
    ? await adminDb.from("modules").select("id, course_id").in("course_id", courseIds)
    : { data: [] as { id: string; course_id: string }[] };
  const moduleIds = (modules ?? []).map((mod) => mod.id);
  const { data: lessons } = moduleIds.length
    ? await adminDb.from("lessons").select("id, module_id, title, quiz_id").in("module_id", moduleIds)
    : { data: [] as { id: string; module_id: string; title: string; quiz_id: string | null }[] };
  const { data: attempts } = memberIds.length
    ? await adminDb.from("quiz_attempts").select("user_id, quiz_id, score, passed, created_at").in("user_id", memberIds)
    : { data: [] as { user_id: string; quiz_id: string; score: number; passed: boolean; created_at: string }[] };
  const dues = await enrollmentDues(enrollments ?? []);
  const { data: progress } = memberIds.length
    ? await adminDb
        .from("lesson_progress")
        .select("user_id, lesson_id, completed, completed_at")
        .in("user_id", memberIds)
    : { data: [] as { user_id: string; lesson_id: string; completed: boolean; completed_at: string | null }[] };

  const courseOfLesson = new Map<string, string>();
  const moduleCourse = new Map((modules ?? []).map((mod) => [mod.id, mod.course_id]));
  for (const lesson of lessons ?? []) {
    const courseId = moduleCourse.get(lesson.module_id);
    if (courseId) courseOfLesson.set(lesson.id, courseId);
  }
  const lessonCount = new Map<string, number>();
  for (const courseId of courseOfLesson.values()) lessonCount.set(courseId, (lessonCount.get(courseId) ?? 0) + 1);
  const doneKey = (userId: string, courseId: string) => `${userId}:${courseId}`;
  const doneCount = new Map<string, number>();
  for (const row of progress ?? []) {
    if (!row.completed) continue;
    const courseId = courseOfLesson.get(row.lesson_id);
    if (!courseId) continue;
    const key = doneKey(row.user_id, courseId);
    doneCount.set(key, (doneCount.get(key) ?? 0) + 1);
  }
  const quizIdsByCourse = new Map<string, string[]>();
  for (const lesson of lessons ?? []) {
    if (!lesson.quiz_id) continue;
    const courseId = courseOfLesson.get(lesson.id);
    if (!courseId) continue;
    const list = quizIdsByCourse.get(courseId) ?? [];
    list.push(lesson.quiz_id);
    quizIdsByCourse.set(courseId, list);
  }
  const latestAttempt = new Map<string, { score: number; passed: boolean; created_at: string }>();
  for (const attempt of attempts ?? []) {
    const key = `${attempt.user_id}:${attempt.quiz_id}`;
    const prev = latestAttempt.get(key);
    if (!prev || attempt.created_at > prev.created_at) latestAttempt.set(key, attempt);
  }
  const titles = new Map((courseRows ?? []).map((course) => [course.id, course.title]));
  const lessonTitles = new Map((lessons ?? []).map((lesson) => [lesson.id, lesson.title]));
  const lastLesson = new Map<string, { title: string; at: string }>();
  for (const row of progress ?? []) {
    if (!row.completed) continue;
    const courseId = courseOfLesson.get(row.lesson_id);
    if (!courseId) continue;
    const key = doneKey(row.user_id, courseId);
    const at = row.completed_at ?? "";
    const prev = lastLesson.get(key);
    if (!prev || at > prev.at) {
      lastLesson.set(key, { title: lessonTitles.get(row.lesson_id) ?? "Lesson", at });
    }
  }
  const byUser = new Map<
    string,
    {
      courseId: string;
      title: string;
      done: number;
      total: number;
      status: string;
      lastLesson: string | null;
      lastAt: string | null;
      dueAt: string | null;
      dueStatus: string;
      quizStatus: string;
      quizScore: number | null;
      secondsSpent: number;
    }[]
  >();
  const spent = await secondsForUsers(memberIds);
  for (const enrollment of enrollments ?? []) {
    const total = lessonCount.get(enrollment.course_id) ?? 0;
    const done = doneCount.get(doneKey(enrollment.user_id, enrollment.course_id)) ?? 0;
    const status = total === 0 ? "no_lessons" : done === 0 ? "not_started" : done >= total ? "finished" : "in_progress";
    const latest = lastLesson.get(doneKey(enrollment.user_id, enrollment.course_id));
    const dueAt = dues[`${enrollment.user_id}:${enrollment.course_id}`] ?? null;
    const quizIds = quizIdsByCourse.get(enrollment.course_id) ?? [];
    const taken = quizIds
      .map((quizId) => latestAttempt.get(`${enrollment.user_id}:${quizId}`))
      .filter((row): row is { score: number; passed: boolean; created_at: string } => Boolean(row));
    let quizStatus = "none";
    let quizScore: number | null = null;
    if (quizIds.length) {
      const failed = taken.filter((row) => !row.passed);
      const worst = failed[0];
      const latestTaken = taken[taken.length - 1];
      if (worst) {
        quizStatus = "failed";
        quizScore = failed.reduce((lowest, row) => Math.min(lowest, row.score), worst.score);
      } else if (!latestTaken || taken.length < quizIds.length) {
        quizStatus = "not_taken";
        quizScore = latestTaken ? latestTaken.score : null;
      } else {
        quizStatus = "passed";
        quizScore = Math.round(taken.reduce((sum, row) => sum + row.score, 0) / taken.length);
      }
    }
    let secondsSpent = 0;
    for (const lesson of lessons ?? []) {
      if (courseOfLesson.get(lesson.id) !== enrollment.course_id) continue;
      secondsSpent += spent.get(`${enrollment.user_id}:${lesson.id}`) ?? 0;
    }
    const list = byUser.get(enrollment.user_id) ?? [];
    list.push({
      courseId: enrollment.course_id,
      title: titles.get(enrollment.course_id) ?? "Course",
      done,
      total,
      status,
      lastLesson: latest?.title ?? null,
      lastAt: latest?.at || null,
      dueAt,
      dueStatus: dueState(dueAt, status === "finished", platform.dueSoonDays),
      quizStatus,
      quizScore,
      secondsSpent,
    });
    byUser.set(enrollment.user_id, list);
  }

  let rows = people.map((member) => ({
    userId: member.id,
    name: member.full_name,
    email: member.email,
    department: departments[member.id] ?? null,
    courses: byUser.get(member.id) ?? [],
  }));
  if (lead) {
    const own = (departments[auth.userId] ?? "").toLowerCase();
    rows = rows.filter((row) => (row.department ?? "").toLowerCase() === own);
  }
  return c.json({ rows });
});

orgs.delete("/members/:id/courses/:courseId", async (c) => {
  const auth = c.get("auth");
  if (auth.profile.role !== "company_admin" && auth.profile.role !== "super_admin") {
    return c.json({ error: "Forbidden" }, 403);
  }
  if (!auth.profile.organization_id) return c.json({ error: "No company" }, 400);
  const memberId = c.req.param("id");
  const courseId = c.req.param("courseId");
  const { data: member } = await adminDb.from("profiles").select("organization_id").eq("id", memberId).maybeSingle();
  if (!member || member.organization_id !== auth.profile.organization_id) {
    return c.json({ error: "That person is not on your team" }, 404);
  }
  const { data: enrollment } = await adminDb
    .from("enrollments")
    .select("id, source")
    .eq("user_id", memberId)
    .eq("course_id", courseId)
    .maybeSingle();
  if (!enrollment) return c.json({ error: "Course is not assigned" }, 404);
  if (enrollment.source !== "seat") {
    return c.json({ error: "A purchased course stays with the learner." }, 400);
  }
  const { error } = await adminDb.from("enrollments").delete().eq("id", enrollment.id);
  if (error) return c.json({ error: error.message }, 400);
  return c.json({ ok: true });
});

orgs.post("/invites/bulk", async (c) => {
  const auth = c.get("auth");
  if (auth.profile.role !== "company_admin" && auth.profile.role !== "super_admin") {
    return c.json({ error: "Forbidden" }, 403);
  }
  if (!auth.profile.organization_id) return c.json({ error: "No company" }, 400);
  const body = z
    .object({
      emails: z.string().min(3).max(20000),
      department: z.string().trim().max(80).optional(),
      role: z.enum(["company_admin", "company_learner"]).default("company_learner"),
    })
    .parse(await c.req.json());
  const raw = Array.from(
    new Set(
      body.emails
        .split(/[\s,;]+/)
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean),
    ),
  );
  if (!raw.length) return c.json({ error: "Paste at least one email." }, 400);
  if (raw.length > 100) return c.json({ error: "Invite up to 100 people at a time." }, 400);
  const valid: string[] = [];
  const skipped: { email: string; reason: string }[] = [];
  for (const email of raw) {
    const parsed = z.string().email().safeParse(email);
    if (parsed.success) valid.push(parsed.data);
    else skipped.push({ email, reason: "Not a valid email" });
  }
  const { data: org } = await adminDb.from("organizations").select("*").eq("id", auth.profile.organization_id).single();
  if (!org || org.status !== "active") return c.json({ error: "Company billing is not active" }, 400);
  const { count: pendingCount } = await adminDb
    .from("invites")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", org.id)
    .eq("status", "pending");
  const open = org.seat_limit - org.seat_used - (pendingCount ?? 0);
  if (valid.length > open) {
    return c.json(
      { error: `Only ${Math.max(0, open)} seat${open === 1 ? "" : "s"} left. This list has ${valid.length} emails.` },
      409,
    );
  }
  const created: { email: string; link: string }[] = [];
  for (const email of valid) {
    const { data: pending } = await adminDb
      .from("invites")
      .select("id")
      .eq("organization_id", org.id)
      .eq("email", email)
      .eq("status", "pending")
      .maybeSingle();
    if (pending) {
      skipped.push({ email, reason: "Already invited" });
      continue;
    }
    const token = nanoid(32);
    const { data: invite, error } = await adminDb
      .from("invites")
      .insert({
        organization_id: org.id,
        email,
        token,
        role: body.role,
        invited_by: auth.userId,
        expires_at: new Date(Date.now() + (await getPlatformSettings()).inviteDays * 86_400_000).toISOString(),
      })
      .select("id")
      .single();
    if (error || !invite) {
      skipped.push({ email, reason: error?.message ?? "Could not create the invite" });
      continue;
    }
    if (body.department?.trim()) await setInviteDepartment(invite.id, body.department);
    const link = `${urls().web}/invite/${token}`;
    await sendMail({
      to: email,
      subject: `Join ${org.name} on WORKIZ`,
      html: `<p>${auth.profile.full_name || auth.email} invited you to learn on WORKIZ.</p><p><a href="${link}">Accept invite</a></p>`,
    });
    created.push({ email, link });
  }
  if (created.length) await logActivity(org.id, auth.userId, "Invited", `${created.length} people`);
  return c.json({ created, skipped });
});

orgs.post("/invites", async (c) => {
  const auth = c.get("auth");
  if (auth.profile.role !== "company_admin" && auth.profile.role !== "super_admin") {
    return c.json({ error: "Forbidden" }, 403);
  }
  if (!auth.profile.organization_id) return c.json({ error: "No company" }, 400);
  const { email, role, department } = z
    .object({
      email: z.string().email(),
      role: z.enum(["company_admin", "company_learner"]).default("company_learner"),
      department: z.string().trim().max(80).optional(),
    })
    .parse(await c.req.json());

  const { data: org } = await adminDb
    .from("organizations")
    .select("*")
    .eq("id", auth.profile.organization_id)
    .single();
  if (!org || org.status !== "active") return c.json({ error: "Company billing is not active" }, 400);
  const { count: pendingCount } = await adminDb
    .from("invites")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", org.id)
    .eq("status", "pending");
  if (org.seat_used + (pendingCount ?? 0) >= org.seat_limit) {
    return c.json({ error: "No seats left. Cancel a pending invite or raise the seat limit." }, 409);
  }

  const token = nanoid(32);
  const expires = new Date(Date.now() + (await getPlatformSettings()).inviteDays * 86_400_000).toISOString();
  const { data: invite, error } = await adminDb
    .from("invites")
    .insert({
      organization_id: org.id,
      email: email.toLowerCase(),
      token,
      role,
      invited_by: auth.userId,
      expires_at: expires,
    })
    .select("*")
    .single();
  if (error) return c.json({ error: error.message }, 400);
  if (department?.trim()) await setInviteDepartment(invite.id, department);

  const link = `${urls().web}/invite/${token}`;
  const mail = await sendMail({
    to: email,
    subject: `Join ${org.name} on WORKIZ`,
    html: `<p>${auth.profile.full_name || auth.email} invited you to learn on WORKIZ.</p><p><a href="${link}">Accept invite</a></p>`,
  });
  await logActivity(org.id, auth.userId, "Invited", email.toLowerCase());
  return c.json({ invite, link, emailSent: mail.sent, emailError: mail.error ?? null });
});

orgs.delete("/invites/:id", async (c) => {
  const auth = c.get("auth");
  if (auth.profile.role !== "company_admin" && auth.profile.role !== "super_admin") {
    return c.json({ error: "Forbidden" }, 403);
  }
  if (!auth.profile.organization_id) return c.json({ error: "No company" }, 400);
  const { data: invite } = await adminDb.from("invites").select("id, organization_id, status").eq("id", c.req.param("id")).maybeSingle();
  if (!invite || invite.organization_id !== auth.profile.organization_id) return c.json({ error: "Invite not found" }, 404);
  if (invite.status !== "pending") return c.json({ error: "That invite is no longer pending" }, 400);
  const { error } = await adminDb.from("invites").update({ status: "revoked" }).eq("id", invite.id);
  if (error) return c.json({ error: error.message }, 400);
  await logActivity(auth.profile.organization_id, auth.userId, "Cancelled invite", invite.id);
  return c.json({ ok: true });
});

orgs.get("/certificates", async (c) => {
  const auth = c.get("auth");
  if (auth.profile.role !== "company_admin" && auth.profile.role !== "super_admin") {
    return c.json({ error: "Forbidden" }, 403);
  }
  if (!auth.profile.organization_id) return c.json({ certificates: [] });
  const { data: members } = await adminDb
    .from("profiles")
    .select("id, email, full_name")
    .eq("organization_id", auth.profile.organization_id);
  const people = members ?? [];
  const memberIds = people.map((member) => member.id);
  const withNumber = memberIds.length
    ? await adminDb.from("certificates").select("id, user_id, course_id, issued_at, number").in("user_id", memberIds)
    : { data: [] as { id: string; user_id: string; course_id: string; issued_at: string; number?: string | null }[], error: null };
  const certificates = withNumber.error
    ? (
        await adminDb.from("certificates").select("id, user_id, course_id, issued_at").in("user_id", memberIds)
      ).data?.map((row) => ({ ...row, number: null as string | null }))
    : withNumber.data;
  const courseIds = Array.from(new Set((certificates ?? []).map((row) => row.course_id)));
  const { data: courses } = courseIds.length
    ? await adminDb.from("courses").select("id, title").in("id", courseIds)
    : { data: [] as { id: string; title: string }[] };
  const titles = new Map((courses ?? []).map((course) => [course.id, course.title]));
  const peopleById = new Map(people.map((member) => [member.id, member]));
  return c.json({
    certificates: await Promise.all(
      (certificates ?? []).map(async (row) => {
        const person = peopleById.get(row.user_id);
        const number = await ensureCertificateNumber(row.id, row.number ?? null);
        return {
          id: row.id,
          userId: row.user_id,
          name: person?.full_name ?? null,
          email: person?.email ?? "",
          courseTitle: titles.get(row.course_id) ?? "Course",
          issuedAt: row.issued_at,
          number,
        };
      }),
    ),
  });
});

orgs.post("/invites/:id/courses", async (c) => {
  const auth = c.get("auth");
  if (auth.profile.role !== "company_admin" && auth.profile.role !== "super_admin") {
    return c.json({ error: "Forbidden" }, 403);
  }
  if (!auth.profile.organization_id) return c.json({ error: "No company" }, 400);
  const { courseId, dueAt } = z.object({ courseId: z.string().uuid(), dueAt: dueField }).parse(await c.req.json());
  const { data: invite } = await adminDb.from("invites").select("*").eq("id", c.req.param("id")).maybeSingle();
  if (!invite || invite.organization_id !== auth.profile.organization_id || invite.status !== "pending") {
    return c.json({ error: "Invite not found" }, 404);
  }
  const { data: course } = await adminDb.from("courses").select("id, title, published").eq("id", courseId).maybeSingle();
  if (!course?.published) return c.json({ error: "Course unavailable" }, 404);
  const current = await courseIdsForInvites([invite.id]);
  await setInviteCourseIds(invite.id, [...(current[invite.id] ?? []), course.id]);
  if (dueAt) await setInviteCourseDue(invite.id, course.id, dueAt);
  return c.json({ ok: true, title: course.title });
});

orgs.post("/invites/:token/accept", async (c) => {
  const auth = c.get("auth");
  const token = c.req.param("token");
  const { data: invite } = await adminDb.from("invites").select("*").eq("token", token).maybeSingle();
  if (!invite || invite.status !== "pending") return c.json({ error: "Invite invalid" }, 400);
  if (new Date(invite.expires_at).getTime() < Date.now()) {
    await adminDb.from("invites").update({ status: "expired" }).eq("id", invite.id);
    return c.json({ error: "Invite expired" }, 400);
  }
  if (invite.email.toLowerCase() !== auth.email.toLowerCase()) {
    return c.json({ error: "Sign in with the invited email" }, 403);
  }

  const { data: org } = await adminDb.from("organizations").select("*").eq("id", invite.organization_id).single();
  if (!org || org.seat_used >= org.seat_limit) return c.json({ error: "No seats left" }, 409);

  await adminDb
    .from("profiles")
    .update({ organization_id: org.id, role: invite.role })
    .eq("id", auth.userId);
  await adminDb
    .from("organizations")
    .update({ seat_used: org.seat_used + 1 })
    .eq("id", org.id);
  await adminDb
    .from("invites")
    .update({ status: "accepted", consumed_at: new Date().toISOString() })
    .eq("id", invite.id);
  await enrollInviteCourses(auth.userId, invite.id);
  const invitedDepartment = (await inviteDepartments([invite.id]))[invite.id];
  if (invitedDepartment) await setMemberDepartment(auth.userId, invitedDepartment);

  return c.json({ ok: true, learnUrl: urls().learn });
});

orgs.delete("/members/:id", async (c) => {
  const auth = c.get("auth");
  if (auth.profile.role !== "company_admin") return c.json({ error: "Forbidden" }, 403);
  const memberId = c.req.param("id");
  if (memberId === auth.userId) return c.json({ error: "You cannot remove yourself" }, 400);
  const { data: member } = await adminDb.from("profiles").select("*").eq("id", memberId).single();
  if (!member || member.organization_id !== auth.profile.organization_id) {
    return c.json({ error: "Not found" }, 404);
  }
  await adminDb
    .from("profiles")
    .update({ organization_id: null, role: "individual_learner" })
    .eq("id", memberId);
  if (auth.profile.organization_id) {
    const { data: org } = await adminDb
      .from("organizations")
      .select("seat_used")
      .eq("id", auth.profile.organization_id)
      .single();
    if (org) {
      await adminDb
        .from("organizations")
        .update({ seat_used: Math.max(0, org.seat_used - 1) })
        .eq("id", auth.profile.organization_id);
    }
  }
  await logActivity(auth.profile.organization_id as string, auth.userId, "Removed", member.email);
  return c.json({ ok: true });
});

function requireCompanyManager(auth: Authed) {
  if (auth.profile.role !== "company_admin" && auth.profile.role !== "super_admin") return "Forbidden";
  if (!auth.profile.organization_id) return "No company";
  return null;
}

orgs.get("/course-sets", async (c) => {
  const auth = c.get("auth");
  const denied = requireCompanyManager(auth);
  if (denied) return c.json({ error: denied }, denied === "Forbidden" ? 403 : 400);
  const sets = await listCourseSets(auth.profile.organization_id as string);
  return c.json({ sets });
});

orgs.post("/course-sets", async (c) => {
  const auth = c.get("auth");
  const denied = requireCompanyManager(auth);
  if (denied) return c.json({ error: denied }, denied === "Forbidden" ? 403 : 400);
  const body = z
    .object({
      name: z.string().trim().min(1).max(80),
      courseIds: z.array(z.string().uuid()).min(1).max(30),
      ordered: z.boolean().optional(),
    })
    .parse(await c.req.json());
  const { data: courses } = await adminDb.from("courses").select("id, published").in("id", body.courseIds);
  const published = new Set((courses ?? []).filter((course) => course.published).map((course) => course.id));
  const courseIds = body.courseIds.filter((id) => published.has(id));
  if (!courseIds.length) return c.json({ error: "Choose at least one published course." }, 400);
  const set = await createCourseSet(auth.profile.organization_id as string, body.name, courseIds, Boolean(body.ordered));
  await logActivity(auth.profile.organization_id as string, auth.userId, "Course set", set.name);
  return c.json({ set });
});

orgs.patch("/course-sets/:id", async (c) => {
  const auth = c.get("auth");
  const denied = requireCompanyManager(auth);
  if (denied) return c.json({ error: denied }, denied === "Forbidden" ? 403 : 400);
  const body = z.object({ ordered: z.boolean() }).parse(await c.req.json());
  const set = await setCourseSetOrdered(auth.profile.organization_id as string, c.req.param("id"), body.ordered);
  if (!set) return c.json({ error: "Course set not found" }, 404);
  return c.json({ set });
});

orgs.delete("/course-sets/:id", async (c) => {
  const auth = c.get("auth");
  const denied = requireCompanyManager(auth);
  if (denied) return c.json({ error: denied }, denied === "Forbidden" ? 403 : 400);
  await deleteCourseSet(auth.profile.organization_id as string, c.req.param("id"));
  return c.json({ ok: true });
});

orgs.post("/course-sets/:id/assign", async (c) => {
  const auth = c.get("auth");
  const denied = requireCompanyManager(auth);
  if (denied) return c.json({ error: denied }, denied === "Forbidden" ? 403 : 400);
  const orgId = auth.profile.organization_id as string;
  const body = z
    .object({
      memberIds: z.array(z.string().uuid()).max(500).optional(),
      department: z.string().trim().min(1).max(80).optional(),
      dueAt: dueField,
    })
    .parse(await c.req.json());
  const set = await getCourseSet(orgId, c.req.param("id"));
  if (!set) return c.json({ error: "Course set not found" }, 404);
  const { data: org } = await adminDb.from("organizations").select("status").eq("id", orgId).single();
  if (!org || org.status !== "active") return c.json({ error: "Company billing is not active" }, 400);

  const memberIds = new Set(body.memberIds ?? []);
  if (body.department) {
    const { data: people } = await adminDb.from("profiles").select("id").eq("organization_id", orgId);
    const ids = (people ?? []).map((person) => person.id);
    const departments = await memberDepartments(ids);
    for (const id of ids) {
      if (departments[id]?.toLowerCase() === body.department.toLowerCase()) memberIds.add(id);
    }
  }
  if (memberIds.size === 0) return c.json({ error: "Choose at least one person." }, 400);

  let assigned = 0;
  for (const memberId of memberIds) {
    const { data: member } = await adminDb.from("profiles").select("organization_id").eq("id", memberId).maybeSingle();
    if (!member || member.organization_id !== orgId) continue;
    for (const courseId of set.courseIds) {
      const { data: existing } = await adminDb
        .from("enrollments")
        .select("id")
        .eq("user_id", memberId)
        .eq("course_id", courseId)
        .maybeSingle();
      if (!existing) {
        const { error } = await adminDb.from("enrollments").insert({
          user_id: memberId,
          course_id: courseId,
          source: "seat",
        });
        if (error) return c.json({ error: error.message }, 400);
      }
      if (body.dueAt) await setEnrollmentDue(memberId, courseId, body.dueAt);
    }
    assigned += 1;
  }
  await logActivity(orgId, auth.userId, "Assigned set", `${set.name} · ${assigned} people`);
  return c.json({ ok: true, name: set.name, assigned, courses: set.courseIds.length });
});

orgs.get("/activity", async (c) => {
  const auth = c.get("auth");
  const denied = requireCompanyManager(auth);
  if (denied) return c.json({ error: denied }, denied === "Forbidden" ? 403 : 400);
  const events = await listActivity(auth.profile.organization_id as string);
  return c.json({ events });
});

orgs.get("/note", async (c) => {
  const auth = c.get("auth");
  const denied = requireCompanyManager(auth);
  if (denied) return c.json({ error: denied }, denied === "Forbidden" ? 403 : 400);
  const note = await getOrgNote(auth.profile.organization_id as string);
  return c.json({ note });
});

orgs.patch("/note", async (c) => {
  const auth = c.get("auth");
  const denied = requireCompanyManager(auth);
  if (denied) return c.json({ error: denied }, denied === "Forbidden" ? 403 : 400);
  const body = z.object({ note: z.string().max(280).nullable() }).parse(await c.req.json());
  const note = await setOrgNote(auth.profile.organization_id as string, body.note);
  await logActivity(auth.profile.organization_id as string, auth.userId, "Dashboard note", note ? "Updated" : "Cleared");
  return c.json({ note });
});
