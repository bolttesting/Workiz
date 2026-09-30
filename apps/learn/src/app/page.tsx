"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { LearnShell } from "@/components/LearnShell";
import { CompanyDashboard, type CompanyHome } from "@/components/CompanyDashboard";
import { DashboardSkeleton } from "@/components/DashboardSkeleton";
import { EmptyState, StatusBadge } from "@/components/LearnUi";
import { apiClient, downloadFile } from "@/lib/api";
import { formatMoney } from "@workix/config";
import type { Course, Enrollment, Lesson, ModuleRow, Organization, Profile } from "@workix/db/types";

const web = process.env.NEXT_PUBLIC_WEB_URL ?? "http://localhost:3000";

type ProgressRow = { lesson_id: string; completed: boolean };
type Certificate = { id: string; course_id: string; issued_at: string };
type Invoice = { id: string; number: string; amount_cents: number; currency: string; pdf_key: string | null };

type DueMark = "none" | "overdue" | "due_soon" | "late" | "on_time";

type CourseRow = {
  course: Course;
  source: Enrollment["source"];
  done: number;
  total: number;
  nextLesson: string | null;
  waitingOn: string | null;
  dueAt: string | null;
  dueMark: DueMark;
  status: "new" | "open" | "done" | "unknown";
};

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
  const [courseTitles, setCourseTitles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [home, setHome] = useState<"learner" | "company" | null>(null);
  const [company, setCompany] = useState<CompanyHome | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const me = await apiClient<{ profile: Profile; organization: Organization | null }>("/me");
      setProfile(me.profile);
      if (me.profile.role === "company_admin") {
        setHome("company");
        const [orgRes, progressRes, activityRes, billingRes] = await Promise.all([
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
              }
            : null,
        );
        setNote(null);
        setRows([]);
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
          outlines?: Record<string, { id: string; title: string }[]>;
        }>("/me/enrollments"),
        apiClient<{ progress: ProgressRow[] }>("/me/progress"),
        apiClient<{ certificates: Certificate[] }>("/me/certificates"),
        showBills ? apiClient<{ invoices: Invoice[] }>("/me/invoices") : Promise.resolve({ invoices: [] as Invoice[] }),
      ]);
      setProfile(me.profile);
      setNote(me.organization?.dashboard_note?.trim() || null);
      setCertificates(certs.certificates);
      setInvoices(bills.invoices);
      const completed = new Set(progress.progress.filter((row) => row.completed).map((row) => row.lesson_id));
      const byCourse = new Map(owned.courses.map((course) => [course.id, course]));
      const titles: Record<string, string> = {};
      for (const course of owned.courses) titles[course.id] = course.title;

      const built = await Promise.all(
        owned.enrollments.map(async (enrollment) => {
          const course = byCourse.get(enrollment.course_id);
          if (!course) return null;
          const packed = owned.outlines?.[course.id];
          let ordered: { id: string; title: string }[] = packed ?? [];
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
            ordered = modules.length
              ? modules.flatMap((mod) => lessons.filter((lesson) => lesson.module_id === mod.id))
              : lessons;
          }
          const total = ordered.length;
          const done = ordered.filter((lesson) => completed.has(lesson.id)).length;
          const next = ordered.find((lesson) => !completed.has(lesson.id));
          const status: CourseRow["status"] =
            total === 0 ? "unknown" : done === 0 ? "new" : done >= total ? "done" : "open";
          const dueAt = enrollment.due_at ? enrollment.due_at.slice(0, 10) : null;
          return {
            course,
            source: enrollment.source,
            done,
            total,
            nextLesson: next?.title ?? null,
            waitingOn: owned.gates?.[course.id]?.title ?? null,
            dueAt,
            dueMark: dueMark(dueAt, status === "done"),
            status,
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

          {note && !individual ? (
            <div className="card shadow-1 radius-8">
              <div className="card-body p-20">
                <h6 className="text-lg mb-8">From your company</h6>
                <p className="mb-0 text-secondary-light">{note}</p>
              </div>
            </div>
          ) : null}

          {next ? (
            <div className="card shadow-1 radius-8">
              <div className="card-body p-20 d-flex flex-wrap align-items-center justify-content-between gap-3">
                <div>
                  <h6 className="mb-4">{next.nextLesson || next.course.title}</h6>
                  <p className="mb-0 text-sm text-secondary-light">
                    {next.course.title}
                    {individual ? "" : ` · ${next.source === "seat" ? "Assigned" : "Purchased"}`}
                    {next.dueAt ? ` · Due ${next.dueAt}` : ""}
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
