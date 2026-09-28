"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { LearnShell } from "@/components/LearnShell";
import { EmptyState, LoadingState, StatusBadge } from "@/components/LearnUi";
import { apiClient, downloadFile } from "@/lib/api";
import { formatMoney } from "@workix/config";
import type { Course, Enrollment, Lesson, ModuleRow, Organization, Profile } from "@workix/db/types";

type ProgressRow = { lesson_id: string; completed: boolean };
type Certificate = { id: string; course_id: string; issued_at: string };
type Invoice = { id: string; number: string; amount_cents: number; currency: string; pdf_key: string | null };

type CourseRow = {
  course: Course;
  source: Enrollment["source"];
  done: number;
  total: number;
  nextLesson: string | null;
  waitingOn: string | null;
  status: "new" | "open" | "done" | "unknown";
};

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
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [me, owned, progress, certs, bills] = await Promise.all([
        apiClient<{ profile: Profile; organization: Organization | null }>("/me"),
        apiClient<{ enrollments: Enrollment[]; courses: Course[]; gates?: Record<string, { title: string; slug: string } | null> }>("/me/enrollments"),
        apiClient<{ progress: ProgressRow[] }>("/me/progress"),
        apiClient<{ certificates: Certificate[] }>("/me/certificates"),
        apiClient<{ invoices: Invoice[] }>("/me/invoices"),
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
          let lessons: Lesson[] = [];
          let modules: ModuleRow[] = [];
          try {
            const outline = await apiClient<{ modules: ModuleRow[]; lessons: Lesson[] }>(`/courses/${course.slug}`);
            modules = outline.modules;
            lessons = outline.lessons;
          } catch {
            lessons = [];
          }
          const ordered = modules.length
            ? modules.flatMap((mod) => lessons.filter((lesson) => lesson.module_id === mod.id))
            : lessons;
          const total = ordered.length;
          const done = ordered.filter((lesson) => completed.has(lesson.id)).length;
          const next = ordered.find((lesson) => !completed.has(lesson.id));
          const status: CourseRow["status"] =
            total === 0 ? "unknown" : done === 0 ? "new" : done >= total ? "done" : "open";
          return {
            course,
            source: enrollment.source,
            done,
            total,
            nextLesson: next?.title ?? null,
            waitingOn: owned.gates?.[course.id]?.title ?? null,
            status,
          } satisfies CourseRow;
        }),
      );
      const present = built.filter((row): row is CourseRow => row !== null);
      present.sort((a, b) => rank(a.status) - rank(b.status) || a.course.title.localeCompare(b.course.title));
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

  const openRow = (row: CourseRow) => !row.waitingOn && (row.status === "open" || row.status === "new");
  const nextAssigned = rows.find((row) => row.source === "seat" && openRow(row));
  const next = nextAssigned ?? rows.find((row) => openRow(row));
  const inProgress = rows.filter((row) => row.status === "open").length;
  const finished = rows.filter((row) => row.status === "done").length;
  const lessonDone = rows.reduce((sum, row) => sum + row.done, 0);
  const lessonTotal = rows.reduce((sum, row) => sum + row.total, 0);
  const lessonPct = lessonTotal > 0 ? Math.min(100, Math.round((lessonDone / lessonTotal) * 100)) : 0;
  const firstName = profile?.full_name?.trim().split(/\s+/)[0];

  const quickActions = [
    { href: next ? `/courses/${next.course.slug}` : "/catalog", label: next ? "Continue" : "Browse catalog", hint: next ? next.course.title : "Find a course to buy", icon: "ri-play-circle-fill" },
    { href: "/catalog", label: "Catalog", hint: "Published courses", icon: "ri-book-2-fill" },
    { href: "/certificates", label: "Certificates", hint: "PDFs you have earned", icon: "ri-award-fill" },
    { href: "/invoices", label: "Invoices", hint: "Your purchases", icon: "ri-file-list-3-fill" },
  ];

  const metrics = [
    { label: "Courses", value: String(rows.length), meta: `${inProgress} in progress`, icon: "ri-book-open-line" },
    { label: "Lessons done", value: String(lessonDone), meta: lessonTotal ? `${lessonTotal} in your courses` : "No lessons yet", icon: "ri-checkbox-circle-line" },
    { label: "Certificates", value: String(certificates.length), meta: finished ? `${finished} courses finished` : "Finish a course to earn one", icon: "ri-award-line" },
    { label: "Invoices", value: String(invoices.length), meta: "Purchase records", icon: "ri-file-list-3-line" },
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
      {loading ? <LoadingState message="Loading dashboard…" /> : null}
      {!loading ? (
        <div className="workiz-dash">
          <section className="workiz-dash-hero">
            <div className="workiz-dash-hero__copy">
              <p className="workiz-dash-hero__eyebrow">WORKIZ LEARN</p>
              <h1 className="workiz-dash-hero__title">{firstName ? `${firstName}'s learning` : "Your learning"}</h1>
              <p className="workiz-dash-hero__lede">
                {next
                  ? `Next up: ${next.nextLesson || next.course.title}.`
                  : "Courses you own, certificates, and invoices in one place."}
              </p>
            </div>
            <div className="workiz-dash-hero__actions">
              {next ? (
                <Link href={`/courses/${next.course.slug}`} className="btn btn-primary-600 radius-8 px-20">
                  Continue
                </Link>
              ) : null}
              <Link href="/catalog" className="btn btn-outline-primary-600 radius-8 px-20">
                Browse catalog
              </Link>
            </div>
          </section>

          {note ? (
            <section className="workiz-dash-panel">
              <div className="workiz-dash-panel__head">
                <div>
                  <h2>From your company</h2>
                </div>
              </div>
              <p className="mb-0">{note}</p>
            </section>
          ) : null}

          {next ? (
            <section className="workiz-dash-panel">
              <div className="workiz-dash-panel__head">
                <div>
                  <h2>Next lesson</h2>
                  <p>
                    {next.course.title} · {next.source === "seat" ? "Assigned" : "Purchased"}
                  </p>
                </div>
                <Link href={`/courses/${next.course.slug}`} className="btn btn-primary-600 radius-8">
                  Continue
                </Link>
              </div>
              <p className="mb-0 fw-medium text-primary-light">{next.nextLesson || next.course.title}</p>
            </section>
          ) : null}

          <section className="workiz-dash-actions" aria-label="Quick actions">
            {quickActions.map((item) => (
              <Link key={item.label} href={item.href} className="workiz-dash-action">
                <span className="workiz-dash-action__icon" aria-hidden="true">
                  <i className={item.icon} />
                </span>
                <span>
                  <strong>{item.label}</strong>
                  <small>{item.hint}</small>
                </span>
                <i className="ri-arrow-right-up-line workiz-dash-action__arrow" aria-hidden="true" />
              </Link>
            ))}
          </section>

          <section className="workiz-dash-metrics" aria-label="Learning summary">
            {metrics.map((metric) => (
              <article key={metric.label} className="workiz-dash-metric">
                <div className="workiz-dash-metric__top">
                  <span className="workiz-dash-metric__icon" aria-hidden="true">
                    <i className={metric.icon} />
                  </span>
                  <span className="workiz-dash-metric__label">{metric.label}</span>
                </div>
                <p className="workiz-dash-metric__value">{metric.value}</p>
                <p className="workiz-dash-metric__meta">{metric.meta}</p>
              </article>
            ))}
          </section>

          <div className="row gy-4">
            <div className="col-xxl-8">
              <div className="workiz-dash-panel">
                <div className="workiz-dash-panel__head">
                  <div>
                    <h2>Your courses</h2>
                    <p>Purchased courses and company seats</p>
                  </div>
                  <Link href="/my-courses" className="workiz-dash-panel__link">
                    My courses
                  </Link>
                </div>
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
                            </td>
                            <td>
                              <StatusBadge label={row.source === "seat" ? "Assigned" : "Purchased"} tone="primary" />
                            </td>
                            <td>{row.total ? `${row.done} / ${row.total}` : "—"}</td>
                            <td>
                              <StatusBadge label={badge.label} tone={badge.tone} />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {rows.length === 0 ? (
                  <EmptyState message="You have no courses yet. Browse the catalog to buy one, or wait for a company seat." />
                ) : null}
              </div>
            </div>
            <div className="col-xxl-4">
              <div className="workiz-dash-panel workiz-dash-panel--seat h-100">
                <div className="workiz-dash-panel__head">
                  <div>
                    <h2>Lesson progress</h2>
                    <p>Across every course you can open</p>
                  </div>
                </div>
                <p className="workiz-dash-seat__figure">
                  {lessonDone}
                  <span> / {lessonTotal}</span>
                </p>
                <div className="workiz-dash-seat__bar" role="progressbar" aria-valuenow={lessonPct} aria-valuemin={0} aria-valuemax={100}>
                  <span style={{ width: `${lessonPct}%` }} />
                </div>
                <p className="workiz-dash-seat__pct">{lessonPct}% of lessons complete</p>
                {next ? (
                  <Link href={`/courses/${next.course.slug}`} className="btn btn-outline-primary-600 radius-8 w-100 mt-auto">
                    Continue {next.course.title}
                  </Link>
                ) : (
                  <Link href="/catalog" className="btn btn-outline-primary-600 radius-8 w-100 mt-auto">
                    Browse catalog
                  </Link>
                )}
              </div>
            </div>
          </div>

          <div className="row gy-4">
            <div className="col-xxl-6">
              <div className="workiz-dash-panel">
                <div className="workiz-dash-panel__head">
                  <div>
                    <h2>Certificates</h2>
                    <p>Issued when every lesson is complete</p>
                  </div>
                  <Link href="/certificates" className="workiz-dash-panel__link">
                    View all
                  </Link>
                </div>
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
                {certificates.length === 0 ? <EmptyState message="Finish every lesson in a course to earn a PDF certificate." /> : null}
              </div>
            </div>
            <div className="col-xxl-6">
              <div className="workiz-dash-panel">
                <div className="workiz-dash-panel__head">
                  <div>
                    <h2>Invoices</h2>
                    <p>Your paid checkouts</p>
                  </div>
                  <Link href="/invoices" className="workiz-dash-panel__link">
                    View all
                  </Link>
                </div>
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
                {invoices.length === 0 ? <EmptyState message="Purchases show up here after checkout." /> : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </LearnShell>
  );
}
