"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { LearnShell } from "@/components/LearnShell";
import { CompanyDashboard, DepartmentGlance, type CompanyHome } from "@/components/CompanyDashboard";
import { DashboardSkeleton } from "@/components/DashboardSkeleton";
import { EmptyState, StatusBadge } from "@/components/LearnUi";
import { apiClient, downloadFile } from "@/lib/api";
import { snoozeToday, snoozedToday } from "@/lib/snooze";
import { formatMoney } from "@workix/config";
import type { Course, Enrollment, Lesson, ModuleRow, Organization, Profile } from "@workix/db/types";

const web = process.env.NEXT_PUBLIC_WEB_URL ?? "http://localhost:3000";

type ProgressRow = { lesson_id: string; completed: boolean; position_seconds?: number };
type Certificate = { id: string; course_id: string; issued_at: string; expires_at?: string | null };
type FailedQuiz = { courseId: string; title: string; score: number };
type OutlineLesson = { id: string; title: string; durationSeconds?: number };
type Invoice = { id: string; number: string; amount_cents: number; currency: string; pdf_key: string | null };
type UnpaidOrder = { id: string; status: string; amount_cents: number; kind: string };

type DueMark = "none" | "overdue" | "due_soon" | "late" | "on_time";

type CourseRow = {
  course: Course;
  source: Enrollment["source"];
  done: number;
  total: number;
  nextLesson: string | null;
  waitingOn: string | null;
  waitingSlug: string | null;
  dueAt: string | null;
  dueMark: DueMark;
  fresh: boolean;
  status: "new" | "open" | "done" | "unknown";
  resumeSeconds: number;
  minutesLeft: number | null;
};

function dubaiDay(date = new Date()) {
  return date.toLocaleDateString("en-CA", { timeZone: "Asia/Dubai" });
}

function dayGap(dueAt: string) {
  const due = new Date(`${dueAt.slice(0, 10)}T23:59:59`);
  if (Number.isNaN(due.getTime())) return 0;
  return Math.ceil((due.getTime() - Date.now()) / 86_400_000);
}

function duePhrase(dueAt: string, overdue: boolean) {
  const gap = dayGap(dueAt);
  if (overdue) {
    const late = Math.max(1, -gap);
    return late === 1 ? "1 day overdue" : `${late} days overdue`;
  }
  if (gap <= 0) return "Due today";
  if (gap === 1) return "Due tomorrow";
  return `Due in ${gap} days`;
}

function clock(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safe / 60);
  const rest = safe % 60;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

function dueMark(dueAt: string | null, finished: boolean): DueMark {
  if (!dueAt) return "none";
  const due = new Date(`${dueAt.slice(0, 10)}T23:59:59`);
  if (Number.isNaN(due.getTime())) return "none";
  const late = Date.now() > due.getTime();
  if (finished) return late ? "late" : "on_time";
  if (late) return "overdue";
  const days = (due.getTime() - Date.now()) / 86_400_000;
  return days <= 7 ? "due_soon" : "on_time";
}

function rank(status: CourseRow["status"]) {
  if (status === "open") return 0;
  if (status === "new") return 1;
  if (status === "unknown") return 2;
  return 3;
}

function statusLabel(status: CourseRow["status"]) {
  if (status === "done") return { label: "Finished", tone: "success" as const };
  if (status === "open") return { label: "In progress", tone: "info" as const };
  if (status === "new") return { label: "Not started", tone: "warning" as const };
  return { label: "Open", tone: "neutral" as const };
}

export default function LearnHome() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [rows, setRows] = useState<CourseRow[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [unpaid, setUnpaid] = useState<UnpaidOrder[]>([]);
  const [courseTitles, setCourseTitles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [home, setHome] = useState<"learner" | "company" | null>(null);
  const [company, setCompany] = useState<CompanyHome | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [attentionFilter, setAttentionFilter] = useState("all");
  const [hiddenAttention, setHiddenAttention] = useState<Set<string>>(new Set());
  const [failedQuizzes, setFailedQuizzes] = useState<FailedQuiz[]>([]);
  const [departmentLead, setDepartmentLead] = useState(false);
  const [departmentRows, setDepartmentRows] = useState<CompanyHome["progress"]>([]);
  const [departmentCerts, setDepartmentCerts] = useState<{ name: string | null; courseTitle: string; expiresAt?: string | null }[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const me = await apiClient<{ profile: Profile; organization: Organization | null }>("/me");
      setProfile(me.profile);
      if (me.profile.role === "company_admin") {
        setHome("company");
        const [orgRes, progressRes, activityRes, billingRes, requestRes, noteRes, certificateRes] = await Promise.all([
          apiClient<{
            organization: Organization | null;
            members: CompanyHome["members"];
            invites: { id: string; email: string; status: string }[];
            pendingInvites?: number;
            seatsOpen?: number;
          }>("/orgs/me"),
          apiClient<{ rows: CompanyHome["progress"] }>("/orgs/progress").catch(() => ({ rows: [] as CompanyHome["progress"] })),
          apiClient<{ events: CompanyHome["activity"] }>("/orgs/activity").catch(() => ({ events: [] as CompanyHome["activity"] })),
          apiClient<{ billing: NonNullable<CompanyHome["billing"]> }>("/orgs/billing").catch(() => ({ billing: null })),
          apiClient<{ requests: CompanyHome["requests"] }>("/orgs/requests").catch(() => ({ requests: [] as CompanyHome["requests"] })),
          apiClient<{ note: string | null }>("/orgs/note").catch(() => ({ note: null })),
          apiClient<{ certificates: NonNullable<CompanyHome["certificates"]> }>("/orgs/certificates").catch(() => ({
            certificates: [] as NonNullable<CompanyHome["certificates"]>,
          })),
        ]);
        const org = orgRes.organization;
        const pending =
          orgRes.pendingInvites ?? orgRes.invites.filter((invite) => invite.status === "pending").length;
        setCompany(
          org
            ? {
                name: org.name,
                seatUsed: org.seat_used,
                seatLimit: org.seat_limit,
                seatsOpen: orgRes.seatsOpen ?? Math.max(0, org.seat_limit - org.seat_used),
                members: orgRes.members,
                pendingInvites: pending,
                progress: progressRes.rows ?? [],
                activity: activityRes.events ?? [],
                billing: billingRes.billing,
                requests: requestRes.requests ?? [],
                note: noteRes.note ?? "",
                certificates: certificateRes.certificates ?? [],
              }
            : null,
        );
        setNote(null);
        setRows([]);
        setUnpaid([]);
        return;
      }
      setHome("learner");
      setCompany(null);
      const showBills = me.profile.role !== "company_learner";
      const [owned, progress, certs, bills] = await Promise.all([
        apiClient<{
          enrollments: Enrollment[];
          courses: Course[];
          gates?: Record<string, { title: string; slug: string } | null>;
          outlines?: Record<string, OutlineLesson[]>;
          failedQuizzes?: FailedQuiz[];
        }>("/me/enrollments"),
        apiClient<{ progress: ProgressRow[] }>("/me/progress"),
        apiClient<{ certificates: Certificate[] }>("/me/certificates"),
        showBills
          ? apiClient<{ invoices: Invoice[]; orders?: UnpaidOrder[] }>("/me/invoices")
          : Promise.resolve({ invoices: [] as Invoice[], orders: [] as UnpaidOrder[] }),
      ]);
      setProfile(me.profile);
      setNote(me.organization?.dashboard_note?.trim() || null);
      setCertificates(certs.certificates);
      setInvoices(bills.invoices);
      setUnpaid((bills.orders ?? []).filter((order) => order.status === "pending" || order.status === "failed"));
      setFailedQuizzes(owned.failedQuizzes ?? []);
      const lead = Boolean((me.profile as Profile & { department_lead?: boolean }).department_lead);
      setDepartmentLead(lead && me.profile.role === "company_learner");
      if (lead && me.profile.role === "company_learner") {
        const [deptProgress, deptCerts] = await Promise.all([
          apiClient<{ rows: CompanyHome["progress"] }>("/orgs/progress").catch(() => ({ rows: [] as CompanyHome["progress"] })),
          apiClient<{ certificates: { name: string | null; courseTitle: string; expiresAt?: string | null }[] }>("/orgs/certificates").catch(() => ({
            certificates: [] as { name: string | null; courseTitle: string; expiresAt?: string | null }[],
          })),
        ]);
        setDepartmentRows(deptProgress.rows ?? []);
        setDepartmentCerts(deptCerts.certificates ?? []);
      } else {
        setDepartmentRows([]);
        setDepartmentCerts([]);
      }
      const completed = new Set(progress.progress.filter((row) => row.completed).map((row) => row.lesson_id));
      const byCourse = new Map(owned.courses.map((course) => [course.id, course]));
      const titles: Record<string, string> = {};
      for (const course of owned.courses) titles[course.id] = course.title;

      const built = await Promise.all(
        owned.enrollments.map(async (enrollment) => {
          const course = byCourse.get(enrollment.course_id);
          if (!course) return null;
          const packed = owned.outlines?.[course.id];
          let ordered: OutlineLesson[] = packed ?? [];
          if (!packed) {
            let lessons: Lesson[] = [];
            let modules: ModuleRow[] = [];
            try {
              const outline = await apiClient<{ modules: ModuleRow[]; lessons: Lesson[] }>(`/courses/${course.slug}`);
              modules = outline.modules;
              lessons = outline.lessons;
            } catch {
              lessons = [];
            }
            const listed = modules.length
              ? modules.flatMap((mod) => lessons.filter((lesson) => lesson.module_id === mod.id))
              : lessons;
            ordered = listed.map((lesson) => ({
              id: lesson.id,
              title: lesson.title,
              durationSeconds: lesson.duration_seconds ?? 0,
            }));
          }
          const total = ordered.length;
          const done = ordered.filter((lesson) => completed.has(lesson.id)).length;
          const next = ordered.find((lesson) => !completed.has(lesson.id));
          const resumeSeconds = next ? progress.progress.find((row) => row.lesson_id === next.id)?.position_seconds ?? 0 : 0;
          let remain = 0;
          let timed = false;
          for (const lesson of ordered) {
            if (completed.has(lesson.id)) continue;
            const duration = lesson.durationSeconds ?? 0;
            if (duration > 0) timed = true;
            const watched = lesson.id === next?.id ? Math.min(duration, resumeSeconds) : 0;
            remain += Math.max(0, duration - watched);
          }
          const minutesLeft = timed && remain > 0 ? Math.max(1, Math.round(remain / 60)) : null;
          const status: CourseRow["status"] =
            total === 0 ? "unknown" : done === 0 ? "new" : done >= total ? "done" : "open";
          const dueAt = enrollment.due_at ? enrollment.due_at.slice(0, 10) : null;
          const createdAt = (enrollment as Enrollment & { created_at?: string | null }).created_at ?? null;
          const createdMs = createdAt ? new Date(createdAt).getTime() : 0;
          const fresh =
            Number.isFinite(createdMs) && createdMs > 0 && Date.now() - createdMs < 86_400_000 && done === 0 && status !== "done";
          return {
            course,
            source: enrollment.source,
            done,
            total,
            nextLesson: next?.title ?? null,
            waitingOn: owned.gates?.[course.id]?.title ?? null,
            waitingSlug: owned.gates?.[course.id]?.slug ?? null,
            dueAt,
            dueMark: dueMark(dueAt, status === "done"),
            fresh,
            status,
            resumeSeconds,
            minutesLeft,
          } satisfies CourseRow;
        }),
      );
      const present = built.filter((row): row is CourseRow => row !== null);
      const dueRank = (mark: DueMark) => (mark === "overdue" ? 0 : mark === "due_soon" ? 1 : 2);
      present.sort(
        (a, b) =>
          rank(a.status) - rank(b.status) || dueRank(a.dueMark) - dueRank(b.dueMark) || a.course.title.localeCompare(b.course.title),
      );
      setRows(present);
      setCourseTitles(titles);
    } catch (err) {
      setError((err as Error).message || "Could not load your account.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const individual = profile?.role === "individual_learner";
  const companyLearner = profile?.role === "company_learner";
  const openRow = (row: CourseRow) => !row.waitingOn && (row.status === "open" || row.status === "new");
  const nextAssigned = rows.find((row) => row.source === "seat" && openRow(row));
  const nextOwned = rows.find((row) => row.source !== "seat" && openRow(row));
  const next = individual ? (nextOwned ?? rows.find((row) => openRow(row))) : (nextAssigned ?? rows.find((row) => openRow(row)));
  const inProgress = rows.filter((row) => row.status === "open").length;
  const finished = rows.filter((row) => row.status === "done").length;
  const lessonDone = rows.reduce((sum, row) => sum + row.done, 0);
  const lessonTotal = rows.reduce((sum, row) => sum + row.total, 0);
  const lessonPct = lessonTotal > 0 ? Math.min(100, Math.round((lessonDone / lessonTotal) * 100)) : 0;
  const firstName = profile?.full_name?.trim().split(/\s+/)[0];
  const notStarted = rows.filter((row) => row.status === "new").length;
  const courseTotal = Math.max(rows.length, 1);
  const attention: {
    key: string;
    kind: "overdue" | "unpaid" | "request" | "other";
    title: string;
    detail: string;
    badge: string;
    tone: "danger" | "warning" | "info";
    href: string;
    action: string;
    external?: boolean;
    downloadId?: string;
  }[] = [];
  for (const row of rows) {
    if (!row.fresh || row.dueMark === "overdue" || row.dueMark === "due_soon" || row.waitingOn) continue;
    attention.push({
      key: `new-${row.course.id}`,
      kind: "other",
      title: row.course.title,
      detail: "Assigned since yesterday. It stays here until you open it.",
      badge: "New",
      tone: "info",
      href: `/courses/${row.course.slug}`,
      action: "Open",
    });
  }
  if (!companyLearner) {
    for (const order of unpaid) {
      attention.push({
        key: `order-${order.id}`,
        kind: "unpaid",
        title: order.status === "failed" ? "A payment did not go through" : "A checkout is not paid",
        detail: `${order.kind === "seats" ? "Company seats" : "Course"} · ${formatMoney(order.amount_cents, "aed")}`,
        badge: order.status === "failed" ? "Failed" : "Unpaid",
        tone: order.status === "failed" ? "danger" : "warning",
        href: `${web}/cart`,
        action: "Cart",
        external: true,
      });
    }
  }
  for (const row of rows) {
    if (row.dueMark === "overdue" || row.dueMark === "due_soon") {
      attention.push({
        key: row.course.id,
        kind: row.dueMark === "overdue" ? "overdue" : "other",
        title: row.course.title,
        detail: `${row.dueAt ? duePhrase(row.dueAt, row.dueMark === "overdue") : row.dueMark === "overdue" ? "Overdue" : "Due soon"}${row.total ? ` · Lesson ${Math.min(row.total, row.done + 1)} of ${row.total}` : ""}`,
        badge: row.dueMark === "overdue" ? "Overdue" : "Due soon",
        tone: row.dueMark === "overdue" ? "danger" : "warning",
        href: `/courses/${row.course.slug}`,
        action: "Continue",
      });
    } else if (row.waitingOn && row.status !== "done") {
      attention.push({
        key: `gate-${row.course.id}`,
        kind: "other",
        title: row.course.title,
        detail: `Finish ${row.waitingOn} first.`,
        badge: "Locked",
        tone: "info",
        href: row.waitingSlug ? `/courses/${row.waitingSlug}` : "/my-courses",
        action: "Open",
      });
    }
  }
  for (const quiz of failedQuizzes) {
    const course = rows.find((row) => row.course.id === quiz.courseId)?.course;
    attention.push({
      key: `quiz-${quiz.courseId}-${quiz.title}`,
      kind: "other",
      title: quiz.title,
      detail: `Scored ${quiz.score}%. Open the quiz and study the missed questions.`,
      badge: "Restudy",
      tone: "danger",
      href: course ? `/courses/${course.slug}` : "/my-courses",
      action: "Restudy",
    });
  }
  const today = dubaiDay();
  const now = new Date();
  for (const cert of certificates) {
    const course = rows.find((row) => row.course.id === cert.course_id)?.course;
    const issued = cert.issued_at?.slice(0, 10);
    if (issued === today) {
      attention.push({
        key: `issued-${cert.id}`,
        kind: "other",
        title: course?.title || "Certificate",
        detail: "Issued today.",
        badge: "Certificate",
        tone: "info",
        href: "/certificates",
        action: "Download",
        downloadId: cert.id,
      });
    }
    if (cert.expires_at) {
      const expires = new Date(cert.expires_at);
      if (!Number.isNaN(expires.getTime()) && expires.getFullYear() === now.getFullYear() && expires.getMonth() === now.getMonth()) {
        attention.push({
          key: `renew-${cert.id}`,
          kind: "other",
          title: course?.title || "Certificate",
          detail: `Expires ${cert.expires_at.slice(0, 10)}. Pass the course again before it lapses.`,
          badge: "Renew",
          tone: "warning",
          href: course ? `/courses/${course.slug}` : "/certificates",
          action: "Renew",
        });
      }
    }
  }
  const nextAlreadyListed = Boolean(next && attention.some((item) => item.key === next.course.id));
  const attentionKey = attention.map((item) => item.key).join("|");
  useEffect(() => {
    setHiddenAttention(new Set(attentionKey.split("|").filter((id) => id && snoozedToday(id))));
  }, [attentionKey]);
  const openAttention = attention.filter((item) => !hiddenAttention.has(item.key));
  const attentionKinds = [
    openAttention.some((item) => item.kind === "overdue") ? { id: "overdue", label: "Overdue" } : null,
    openAttention.some((item) => item.kind === "unpaid") ? { id: "unpaid", label: "Unpaid" } : null,
    openAttention.some((item) => item.kind === "request") ? { id: "request", label: "Requests" } : null,
  ].filter((item): item is { id: string; label: string } => Boolean(item));
  const showAttentionFilters = openAttention.length > 4 && attentionKinds.length > 1;
  const visibleAttention = attentionFilter === "all" ? openAttention : openAttention.filter((item) => item.kind === attentionFilter);

  function hideAttention(key: string) {
    snoozeToday(key);
    setHiddenAttention((current) => new Set(current).add(key));
  }

  const metrics = [
    {
      label: "Courses",
      value: String(rows.length),
      meta: inProgress ? `${inProgress} in progress` : "None in progress",
      icon: "ri-book-open-line",
      tint: "gradient-bg-end-1",
      bubble: "bg-warning-600",
    },
    {
      label: "Lessons done",
      value: String(lessonDone),
      meta: lessonTotal ? `of ${lessonTotal} lessons` : "No lessons yet",
      icon: "ri-checkbox-circle-line",
      tint: "gradient-bg-end-2",
      bubble: "bg-blue-600",
    },
    {
      label: "Certificates",
      value: String(certificates.length),
      meta: finished ? `${finished} courses finished` : "Finish a course to earn one",
      icon: "ri-award-line",
      tint: "gradient-bg-end-5",
      bubble: "bg-success-600",
    },
    ...(profile?.role === "company_learner"
      ? []
      : [
          {
            label: "Invoices",
            value: String(invoices.length),
            meta: "Paid purchases",
            icon: "ri-file-list-3-line",
            tint: "gradient-bg-end-3",
            bubble: "bg-purple-600",
          },
        ]),
  ];

  const mix = [
    { label: "In progress", count: inProgress, color: "bg-primary-600" },
    { label: "Not started", count: notStarted, color: "bg-warning-600" },
    { label: "Finished", count: finished, color: "bg-success-600" },
  ];

  return (
    <LearnShell>
      {error ? (
        <div className="alert alert-danger radius-8 mb-24" role="alert">
          {error}{" "}
          <button type="button" className="btn btn-sm btn-outline-danger-600 ms-8" onClick={() => void load()}>
            Try again
          </button>
        </div>
      ) : null}
      {loading ? (
        <DashboardSkeleton
          variant={home === "company" ? "company" : "learner"}
          showInvoices={profile?.role !== "company_learner"}
          individual={profile?.role === "individual_learner"}
        />
      ) : null}
      {!loading && home === "company" ? (
        company ? (
          <CompanyDashboard company={company} />
        ) : (
          <EmptyState message="This account is not attached to a company." />
        )
      ) : null}
      {!loading && home !== "company" ? (
        <div className="workiz-dash">
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
            <div>
              <h6 className="fw-semibold mb-0">Dashboard</h6>
              <p className="text-neutral-600 mt-4 mb-0">
                {firstName ? `${firstName}, ` : ""}
                {next
                  ? `next up is ${next.nextLesson || next.course.title}.`
                  : individual
                    ? "Courses you buy, certificates, and invoices."
                    : companyLearner
                      ? "Courses assigned to you, and certificates."
                      : "Courses you own, certificates, and invoices."}
              </p>
            </div>
            <div className="d-flex flex-wrap gap-2">
              {next ? (
                <Link href={`/courses/${next.course.slug}`} className="btn btn-primary-600 radius-8 px-20">
                  Continue
                </Link>
              ) : null}
              {individual ? (
                <a
                  href={`${web}/courses`}
                  className={`btn radius-8 px-20 ${next ? "btn-outline-primary-600" : "btn-primary-600"}`}
                >
                  Buy a course
                </a>
              ) : (
                <Link href="/catalog" className="btn btn-outline-primary-600 radius-8 px-20">
                  Browse catalog
                </Link>
              )}
            </div>
          </div>

          {rows.length > 0 || unpaid.length > 0 || failedQuizzes.length > 0 || certificates.length > 0 ? (
            <div className="card shadow-1 radius-8">
              <div className="card-body p-0">
                <div className="px-20 py-16 border-bottom border-neutral-200">
                  <h6 className="text-lg mb-0">Needs attention</h6>
                </div>
                <div className="p-20">
                  {openAttention.length === 0 ? (
                    <EmptyState message="Nothing needs attention today." />
                  ) : (
                    <>
                      {showAttentionFilters ? (
                        <div className="workiz-attention-filters">
                          <button type="button" className={`btn btn-sm radius-8 ${attentionFilter === "all" ? "btn-primary-600" : "btn-outline-primary-600"}`} onClick={() => setAttentionFilter("all")}>
                            All
                          </button>
                          {attentionKinds.map((kind) => (
                            <button
                              key={kind.id}
                              type="button"
                              className={`btn btn-sm radius-8 ${attentionFilter === kind.id ? "btn-primary-600" : "btn-outline-primary-600"}`}
                              onClick={() => setAttentionFilter(kind.id)}
                            >
                              {kind.label}
                            </button>
                          ))}
                        </div>
                      ) : null}
                      <div className="d-flex flex-column gap-3">
                        {visibleAttention.map((item) => (
                          <div key={item.key} className={`workiz-attention-row${item.kind === "overdue" ? " workiz-attention-row--overdue" : ""}`}>
                            <div className="workiz-attention-row__copy">
                              <div className="fw-medium">{item.title}</div>
                              <div className="text-sm text-secondary-light dirham-sign">{item.detail}</div>
                            </div>
                            <div className="workiz-attention-row__actions">
                              <StatusBadge label={item.badge} tone={item.tone} />
                              <button type="button" className="btn btn-sm btn-outline-primary-600 radius-8" onClick={() => hideAttention(item.key)}>
                                Tomorrow
                              </button>
                              {item.downloadId ? (
                                <button
                                  type="button"
                                  className="btn btn-sm btn-primary-600 radius-8"
                                  disabled={downloading === item.downloadId}
                                  onClick={() => {
                                    const id = item.downloadId;
                                    if (!id) return;
                                    setDownloading(id);
                                    const name = (item.title || "certificate").replace(/[^\w]+/g, "-");
                                    downloadFile(`/me/certificates/${id}/pdf`, `${name}.pdf`)
                                      .catch((err) => setError((err as Error).message))
                                      .finally(() => setDownloading(null));
                                  }}
                                >
                                  {downloading === item.downloadId ? "Preparing…" : "Download"}
                                </button>
                              ) : item.external ? (
                                <a href={item.href} className="btn btn-sm btn-primary-600 radius-8">
                                  {item.action}
                                </a>
                              ) : (
                                <Link href={item.href} className="btn btn-sm btn-primary-600 radius-8">
                                  {item.action}
                                </Link>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          ) : null}

          {departmentLead ? <DepartmentGlance rows={departmentRows} certificates={departmentCerts} /> : null}

          {note && !individual ? (
            <div className="card shadow-1 radius-8">
              <div className="card-body p-20">
                <h6 className="text-lg mb-8">From your company</h6>
                <p className="mb-0 text-secondary-light">{note}</p>
              </div>
            </div>
          ) : null}

          {next && !nextAlreadyListed ? (
            <div className="card shadow-1 radius-8">
              <div className="card-body p-20 d-flex flex-wrap align-items-center justify-content-between gap-3">
                <div>
                  <h6 className="mb-4">{next.nextLesson || next.course.title}</h6>
                  <p className="mb-0 text-sm text-secondary-light">
                    {next.course.title}
                    {next.total ? ` · Lesson ${Math.min(next.total, next.done + 1)} of ${next.total}` : ""}
                    {next.resumeSeconds > 2 ? ` · Resume at ${clock(next.resumeSeconds)}` : ""}
                    {next.minutesLeft ? ` · about ${next.minutesLeft} ${next.minutesLeft === 1 ? "minute" : "minutes"} left` : ""}
                    {individual ? "" : ` · ${next.source === "seat" ? "Assigned" : "Purchased"}`}
                    {next.dueAt ? ` · ${duePhrase(next.dueAt, next.dueMark === "overdue")}` : ""}
                  </p>
                  {next.dueMark === "overdue" || next.dueMark === "due_soon" ? (
                    <div className="mt-8">
                      <StatusBadge
                        label={next.dueMark === "overdue" ? "Overdue" : "Due soon"}
                        tone={next.dueMark === "overdue" ? "danger" : "warning"}
                      />
                    </div>
                  ) : null}
                </div>
                <Link href={`/courses/${next.course.slug}`} className="btn btn-primary-600 radius-8 px-20">
                  Continue
                </Link>
              </div>
            </div>
          ) : null}

          <div className="row gy-4">
            <div className="col-xxl-8">
              <div className="row gy-4">
                {metrics.map((metric) => (
                  <div key={metric.label} className="col-sm-6">
                    <div className={`card shadow-1 radius-8 h-100 ${metric.tint}`}>
                      <div className="card-body p-20">
                        <div className="d-flex flex-wrap align-items-center gap-3 mb-16">
                          <div className={`w-44-px h-44-px ${metric.bubble} rounded-circle d-flex justify-content-center align-items-center`}>
                            <i className={`${metric.icon} text-white text-xl`} aria-hidden="true" />
                          </div>
                          <p className="fw-medium text-primary-light mb-0">{metric.label}</p>
                        </div>
                        <h6 className="mb-0">{metric.value}</h6>
                        <p className="fw-medium text-sm text-primary-light mt-12 mb-0">{metric.meta}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="col-xxl-4">
              <div className="card h-100">
                <div className="card-body p-0">
                  <div className="d-flex align-items-center justify-content-between px-20 py-16 border-bottom border-neutral-200">
                    <h6 className="text-lg mb-0">Course mix</h6>
                  </div>
                  <div className="p-20">
                    {rows.length === 0 ? (
                      <p className="mb-0 text-secondary-light">
                        {individual
                          ? "You have not bought a course yet."
                          : companyLearner
                            ? "No course has been assigned to you yet."
                            : "You have no courses yet."}
                      </p>
                    ) : (
                      <>
                        <div className="d-flex gap-2">
                          {mix.map((item) =>
                            item.count > 0 ? (
                              <div
                                key={item.label}
                                className={`h-44-px ${item.color} rounded`}
                                style={{ width: `${Math.max(12, Math.round((item.count / courseTotal) * 100))}%` }}
                              />
                            ) : null,
                          )}
                        </div>
                        <div className="mt-32 d-flex flex-column gap-24">
                          {mix.map((item) => (
                            <div key={item.label} className="d-flex align-items-center justify-content-between">
                              <div className="d-flex align-items-center gap-2">
                                <span className={`w-12-px h-12-px radius-2 ${item.color}`} />
                                <span className="text-neutral-600">{item.label}</span>
                              </div>
                              <span className="fw-semibold text-primary-light">{item.count}</span>
                            </div>
                          ))}
                        </div>
                        <p className="text-sm text-secondary-light mt-24 mb-0">{lessonPct}% of lessons complete</p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="card shadow-1 radius-8">
            <div className="card-body p-0">
              <div className="d-flex flex-wrap align-items-center justify-content-between px-20 py-16 border-bottom border-neutral-200">
                <h6 className="text-lg mb-0">Your courses</h6>
                <Link href="/my-courses" className="text-primary-600 fw-semibold text-sm">
                  My courses
                </Link>
              </div>
              <div className="p-20">
                <div className="workiz-admin-table-wrap">
                  <table className="table workiz-dash-table mb-0">
                    <thead>
                      <tr>
                        <th>Course</th>
                        <th>Access</th>
                        <th>Progress</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row) => {
                        const badge = statusLabel(row.status);
                        return (
                          <tr key={row.course.id}>
                            <td>
                              <Link href={`/courses/${row.course.slug}`} className="workiz-dash-course-link">
                                {row.course.title}
                              </Link>
                              {row.nextLesson && row.status !== "done" ? (
                                <div className="text-secondary-light text-sm">{row.nextLesson}</div>
                              ) : null}
                              {row.dueAt && row.status !== "done" ? (
                                <div className="text-secondary-light text-sm">Due {row.dueAt}</div>
                              ) : null}
                            </td>
                            <td>
                              <StatusBadge label={row.source === "seat" ? "Assigned" : "Purchased"} tone="primary" />
                            </td>
                            <td>{row.total ? `${row.done} / ${row.total}` : "—"}</td>
                            <td>
                              <div className="d-flex flex-wrap gap-2">
                                <StatusBadge label={badge.label} tone={badge.tone} />
                                {row.dueMark === "overdue" ? <StatusBadge label="Overdue" tone="danger" /> : null}
                                {row.dueMark === "due_soon" ? <StatusBadge label="Due soon" tone="warning" /> : null}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {rows.length === 0 ? (
                  <EmptyState
                    message={
                      individual
                        ? "You have not bought a course yet. Buy one from the website to start."
                        : companyLearner
                          ? "No course has been assigned to you yet."
                          : "You have no courses yet."
                    }
                  />
                ) : null}
              </div>
            </div>
          </div>

          <div className="row gy-4">
            <div className={profile?.role === "company_learner" ? "col-12" : "col-xxl-6"}>
              <div className="card shadow-1 radius-8 h-100">
                <div className="card-body p-0">
                  <div className="d-flex flex-wrap align-items-center justify-content-between px-20 py-16 border-bottom border-neutral-200">
                    <h6 className="text-lg mb-0">Certificates</h6>
                    <Link href="/certificates" className="text-primary-600 fw-semibold text-sm">
                      View all
                    </Link>
                  </div>
                  <div className="p-20">
                <div className="workiz-admin-table-wrap">
                  <table className="table workiz-dash-table mb-0">
                    <thead>
                      <tr>
                        <th>Course</th>
                        <th>Issued</th>
                        <th>PDF</th>
                      </tr>
                    </thead>
                    <tbody>
                      {certificates.map((cert) => (
                        <tr key={cert.id}>
                          <td>{courseTitles[cert.course_id] ?? "Certificate"}</td>
                          <td>{cert.issued_at.slice(0, 10)}</td>
                          <td>
                            <button
                              type="button"
                              className="btn btn-outline-primary-600 btn-sm radius-8"
                              disabled={downloading === cert.id}
                              onClick={() => {
                                setDownloading(cert.id);
                                const name = (courseTitles[cert.course_id] ?? "certificate").replace(/[^\w]+/g, "-");
                                downloadFile(`/me/certificates/${cert.id}/pdf`, `${name}.pdf`)
                                  .catch((err) => setError((err as Error).message))
                                  .finally(() => setDownloading(null));
                              }}
                            >
                              {downloading === cert.id ? "Preparing…" : "Download"}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {certificates.length === 0 ? (
                  <EmptyState message="Finish every lesson, and pass the quiz when the course has one, to earn a certificate." />
                ) : null}
                  </div>
                </div>
              </div>
            </div>
            {profile?.role === "company_learner" ? null : (
            <div className="col-xxl-6">
              <div className="card shadow-1 radius-8 h-100">
                <div className="card-body p-0">
                  <div className="d-flex flex-wrap align-items-center justify-content-between px-20 py-16 border-bottom border-neutral-200">
                    <h6 className="text-lg mb-0">Invoices</h6>
                    <Link href="/invoices" className="text-primary-600 fw-semibold text-sm">
                      View all
                    </Link>
                  </div>
                  <div className="p-20">
                <div className="workiz-admin-table-wrap">
                  <table className="table workiz-dash-table mb-0">
                    <thead>
                      <tr>
                        <th>Number</th>
                        <th>Amount</th>
                        <th>Status</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoices.map((invoice) => (
                        <tr key={invoice.id}>
                          <td className="fw-medium">{invoice.number}</td>
                          <td className="dirham-sign">{formatMoney(invoice.amount_cents, "aed")}</td>
                          <td>
                            <StatusBadge label="Paid" tone="success" />
                          </td>
                          <td>
                            <button
                              type="button"
                              className="btn btn-outline-primary-600 btn-sm radius-8"
                              disabled={downloading === invoice.id}
                              onClick={() => {
                                setDownloading(invoice.id);
                                downloadFile(`/me/invoices/${invoice.id}/pdf`, `${invoice.number}.pdf`)
                                  .catch((err) => setError((err as Error).message))
                                  .finally(() => setDownloading(null));
                              }}
                            >
                              {downloading === invoice.id ? "Preparing…" : "Download"}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {invoices.length === 0 ? (
                  <EmptyState message={individual ? "A receipt appears here after you buy a course." : "Purchases show up here after checkout."} />
                ) : null}
                  </div>
                </div>
              </div>
            </div>
            )}
          </div>
        </div>
      ) : null}
    </LearnShell>
  );
}
