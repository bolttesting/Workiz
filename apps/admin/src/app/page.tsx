"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AdminShell } from "@/components/AdminShell";
import { DashboardSkeleton } from "@/components/DashboardSkeleton";
import { EmptyState, StatusBadge } from "@/components/AdminUi";
import { apiClient, downloadFile } from "@/lib/api";
import { formatMoney } from "@workix/config";
import { snoozeToday, snoozedToday } from "@/lib/snooze";

type RevenueMonth = { month: string; revenueCents: number; orders: number };
type RevenueDay = { day: string; revenueCents: number };
type MonthSource = { label: string; amountCents: number };
type RecentOrder = {
  id: string;
  kind: string;
  status: string;
  amount_cents: number;
  currency: string;
  created_at: string;
  invoiceId?: string | null;
  invoiceNumber?: string | null;
};
type ProblemOrder = {
  id: string;
  kind: string;
  status: string;
  amount_cents: number;
  created_at: string;
};
type NamedPerson = { id: string; name: string; email: string };
type AlmostFull = { id: string; name: string; open: number };
type BareLesson = { courseId: string; courseTitle: string; lessonTitle: string };
type FreePlan = { id: string; name: string };
type RecentCourse = {
  id: string;
  title: string;
  slug: string;
  published: boolean;
  price_cents: number;
  currency: string;
  created_at?: string;
};

type Stats = {
  users: number;
  orgs: number;
  courses: number;
  publishedCourses: number;
  quizzes: number;
  orders: number;
  seatsUsed: number;
  seatsLimit: number;
  revenueCents: number;
  revenueByMonth: RevenueMonth[];
  revenueByDay: RevenueDay[];
  monthSources: MonthSource[];
  recentOrders: RecentOrder[];
  recentCourses: RecentCourse[];
  unanswered: number;
  pendingOrders: number;
  problemOrders: ProblemOrder[];
  idleCount: number;
  idlePeople: NamedPerson[];
  almostFull: AlmostFull[];
  newNames: string[];
  bareLessons: BareLesson[];
  freePlans: FreePlan[];
  settingGaps: Array<"issuer" | "email">;
  mailNote: string | null;
  draftCoursesNamed: { id: string; title: string }[];
  openQuestions: { id: string; prompt: string; courseTitle: string }[];
  pastDueCompanies: { id: string; name: string }[];
  unusedSeatCompanies: { id: string; name: string; seats: number }[];
  coursesWithoutInstructor: { id: string; title: string }[];
  blogDrafts: { id: string; title: string }[];
  emptyQuizzes: { id: string; title: string; courseId: string | null }[];
};

const emptyStats: Stats = {
  users: 0,
  orgs: 0,
  courses: 0,
  publishedCourses: 0,
  quizzes: 0,
  orders: 0,
  seatsUsed: 0,
  seatsLimit: 0,
  revenueCents: 0,
  revenueByMonth: [],
  revenueByDay: [],
  monthSources: [],
  recentOrders: [],
  recentCourses: [],
  unanswered: 0,
  pendingOrders: 0,
  problemOrders: [],
  idleCount: 0,
  idlePeople: [],
  almostFull: [],
  newNames: [],
  bareLessons: [],
  freePlans: [],
  settingGaps: [],
  mailNote: null,
  draftCoursesNamed: [],
  openQuestions: [],
  pastDueCompanies: [],
  unusedSeatCompanies: [],
  coursesWithoutInstructor: [],
  blogDrafts: [],
  emptyQuizzes: [],
};

function aed(cents: number) {
  const major = cents / 100;
  const whole = Number.isInteger(major);
  return `AED ${major.toLocaleString("en-US", { minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: 2 })}`;
}

function dayLabel(day: string) {
  const parts = day.split("-");
  const y = Number(parts[0] || "1970");
  const m = Number(parts[1] || "1");
  const d = Number(parts[2] || "1");
  return new Date(Date.UTC(y, m - 1, d)).toLocaleString("en-US", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

function monthLabel(month: string) {
  const parts = month.split("-");
  const y = Number(parts[0] || "1970");
  const m = Number(parts[1] || "1");
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleString("en-US", {
    month: "short",
    year: "2-digit",
    timeZone: "UTC",
  });
}

function longMonth(month: string) {
  const parts = month.split("-");
  const y = Number(parts[0] || "1970");
  const m = Number(parts[1] || "1");
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleString("en-US", { month: "long", timeZone: "UTC" });
}

export default function AdminHome() {
  const [stats, setStats] = useState<Stats>(emptyStats);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attentionFilter, setAttentionFilter] = useState("all");
  const [hiddenAttention, setHiddenAttention] = useState<Set<string>>(new Set());
  const [chartRange, setChartRange] = useState<"month" | "year">("year");
  const [downloading, setDownloading] = useState<string | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<{ destroy: () => void } | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    apiClient<Stats>("/admin/stats")
      .then((data) => {
        if (!cancelled) {
          setStats({ ...emptyStats, ...data });
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) setError((err as Error).message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    let tries = 0;

    async function renderChart() {
      if (!chartRef.current || cancelled) return;
      const ApexCharts = (
        window as Window & {
          ApexCharts?: new (el: Element, options: object) => { render: () => Promise<void>; destroy: () => void };
        }
      ).ApexCharts;
      if (!ApexCharts) {
        if (tries < 40) {
          tries += 1;
          window.setTimeout(renderChart, 150);
        }
        return;
      }
      chartInstance.current?.destroy();
      chartInstance.current = null;
      const points = chartRange === "month" ? stats.revenueByDay : stats.revenueByMonth;
      const labels = points.map((row) => ("day" in row ? dayLabel(row.day) : monthLabel(row.month)));
      const series = points.map((row) => Number((row.revenueCents / 100).toFixed(2)));
      const chart = new ApexCharts(chartRef.current, {
        chart: {
          type: "area",
          height: 300,
          toolbar: { show: false },
          fontFamily: "inherit",
          sparkline: { enabled: false },
        },
        colors: ["#b69856"],
        dataLabels: { enabled: false },
        stroke: { curve: "smooth", width: 2.5 },
        fill: {
          type: "gradient",
          gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.02, stops: [0, 85, 100] },
        },
        series: [{ name: "Revenue", data: series }],
        xaxis: {
          categories: labels,
          labels: { style: { colors: "#6b7280", fontSize: "11px" } },
          axisBorder: { show: false },
          axisTicks: { show: false },
        },
        yaxis: {
          labels: {
            style: { colors: "#6b7280", fontSize: "11px" },
            formatter: (value: number) => `AED ${value.toFixed(0)}`,
          },
        },
        tooltip: {
          theme: "light",
          y: { formatter: (value: number) => `AED ${value.toFixed(2)}` },
        },
        grid: { borderColor: "rgba(16,40,70,0.08)", strokeDashArray: 4 },
      });
      chartInstance.current = chart;
      await chart.render();
    }

    renderChart();
    return () => {
      cancelled = true;
      chartInstance.current?.destroy();
      chartInstance.current = null;
    };
  }, [chartRange, stats.revenueByDay, stats.revenueByMonth]);

  const seatPct =
    stats.seatsLimit > 0 ? Math.min(100, Math.round((stats.seatsUsed / stats.seatsLimit) * 100)) : 0;
  const seatsOpen = Math.max(0, stats.seatsLimit - stats.seatsUsed);
  const draftCourses = Math.max(0, stats.courses - stats.publishedCourses);
  const months = stats.revenueByMonth;
  const latest = months[months.length - 1];
  const previous = months.length > 1 ? months[months.length - 2] : undefined;
  const now = new Date();
  const currentMonth = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  const monthStillOpen = latest?.month === currentMonth;
  const revenueDelta =
    !monthStillOpen && latest && previous && previous.revenueCents > 0
      ? Math.round(((latest.revenueCents - previous.revenueCents) / previous.revenueCents) * 100)
      : null;

  const metrics = [
    {
      label: "People",
      value: stats.users.toLocaleString(),
      meta: "Learners and admins",
      icon: "ri-user-3-line",
      tint: "gradient-bg-end-1",
      bubble: "bg-warning-600",
    },
    {
      label: "Companies",
      value: stats.orgs.toLocaleString(),
      meta: "Seat accounts",
      icon: "ri-building-line",
      tint: "gradient-bg-end-2",
      bubble: "bg-blue-600",
    },
    {
      label: "Live courses",
      value: String(stats.publishedCourses),
      meta: `${stats.courses} in the catalog · ${stats.quizzes} ${stats.quizzes === 1 ? "quiz" : "quizzes"}`,
      icon: "ri-book-open-line",
      tint: "gradient-bg-end-5",
      bubble: "bg-success-600",
    },
    {
      label: "Revenue",
      value: aed(stats.revenueCents),
      meta: monthStillOpen
        ? `${longMonth(latest?.month || currentMonth)} so far`
        : revenueDelta === null
          ? `${stats.orders} paid orders`
          : `${revenueDelta > 0 ? "+" : ""}${revenueDelta}% vs ${monthLabel(previous?.month || "")}`,
      icon: "ri-money-dollar-circle-line",
      tint: "gradient-bg-end-3",
      bubble: "bg-purple-600",
    },
  ];

  const seatMix = [
    { label: "Seats in use", count: stats.seatsUsed, color: "bg-primary-600" },
    { label: "Seats open", count: seatsOpen, color: "bg-success-600" },
  ];
  const courseMix = [
    { label: "Published", count: stats.publishedCourses, color: "bg-warning-600" },
    { label: "Drafts", count: draftCourses, color: "bg-purple-600" },
  ];
  const seatTotal = Math.max(stats.seatsLimit, 1);
  const courseTotal = Math.max(stats.courses, 1);
  const adminAttention = [
    ...stats.draftCoursesNamed.slice(0, 5).map((course) => ({
      key: `draft-${course.id}`,
      kind: "other" as const,
      title: `${course.title} is still a draft`,
      detail: "Drafts stay off the public catalog until you publish them.",
      badge: "Draft",
      tone: "warning" as const,
      href: `/courses/${course.id}`,
      action: "Review",
    })),
    ...stats.openQuestions.slice(0, 5).map((question) => ({
      key: `question-${question.id}`,
      kind: "other" as const,
      title: question.prompt,
      detail: `${question.courseTitle} · A reply shows on the course page and emails the learner.`,
      badge: "Unanswered",
      tone: "warning" as const,
      href: "/questions",
      action: "Reply",
    })),
    ...stats.pastDueCompanies.slice(0, 5).map((org) => ({
      key: `pastdue-${org.id}`,
      kind: "unpaid" as const,
      title: `${org.name} is past due`,
      detail: "The monthly seat payment did not go through.",
      badge: "Past due",
      tone: "danger" as const,
      href: `/organizations?q=${encodeURIComponent(org.name)}`,
      action: "Company",
    })),
    ...stats.unusedSeatCompanies.slice(0, 5).map((org) => ({
      key: `unused-${org.id}`,
      kind: "people" as const,
      title: `${org.name} has paid seats nobody is using`,
      detail: `${org.seats} ${org.seats === 1 ? "seat" : "seats"} and no one has joined.`,
      badge: "Seats",
      tone: "warning" as const,
      href: `/organizations?q=${encodeURIComponent(org.name)}`,
      action: "Company",
    })),
    ...stats.coursesWithoutInstructor.slice(0, 5).map((course) => ({
      key: `instructor-${course.id}`,
      kind: "catalog" as const,
      title: `${course.title} has no instructor`,
      detail: "A live course is not assigned to anyone who teaches it.",
      badge: "Instructor",
      tone: "warning" as const,
      href: `/courses/${course.id}`,
      action: "Open",
    })),
    ...stats.blogDrafts.slice(0, 5).map((post) => ({
      key: `blog-${post.id}`,
      kind: "catalog" as const,
      title: `${post.title} is a blog draft`,
      detail: "Draft posts stay off the public site until you publish them.",
      badge: "Draft",
      tone: "warning" as const,
      href: "/blog",
      action: "Blog",
    })),
    stats.pendingOrders > 0
      ? {
          key: "unpaid",
          kind: "unpaid" as const,
          title: `${stats.pendingOrders} checkout${stats.pendingOrders === 1 ? " was" : "s were"} not paid`,
          detail: "These orders are still pending. Paid ones appear under Revenue.",
          badge: "Unpaid",
          tone: "danger" as const,
          href: "/orders",
          action: "Orders",
        }
      : null,
    ...stats.problemOrders.slice(0, 3).map((order) => ({
      key: `pay-${order.id}`,
      kind: "failed" as const,
      title: order.status === "refunded" ? "A payment was refunded" : "A payment failed",
      detail: `${order.kind === "seats" ? "Company seats" : "Course"} · ${aed(order.amount_cents || 0)} · ${order.created_at?.slice(0, 10) || ""}`,
      badge: order.status === "refunded" ? "Refunded" : "Failed",
      tone: "danger" as const,
      href: `/orders?q=${encodeURIComponent(order.id)}`,
      action: "Order",
    })),
    stats.idleCount > 0
      ? {
          key: "idle",
          kind: "people" as const,
          title:
            stats.idleCount === 1
              ? `${stats.idlePeople[0]?.name || "Someone"} signed up and has not started`
              : `${stats.idleCount} people signed up and have not started`,
          detail: stats.idlePeople
            .slice(0, 3)
            .map((person) => person.name)
            .join(", "),
          badge: "Not started",
          tone: "warning" as const,
          href: stats.idlePeople[0]?.email ? `/users?q=${encodeURIComponent(stats.idlePeople[0].email)}` : "/users",
          action: "People",
        }
      : null,
    ...stats.almostFull.slice(0, 3).map((org) => ({
      key: `seats-${org.id}`,
      kind: "people" as const,
      title: org.open === 0 ? `${org.name} has no seats left` : `${org.name} has 1 seat left`,
      detail: "Assign or add a seat before the next person joins.",
      badge: "Seats",
      tone: "warning" as const,
      href: `/organizations?q=${encodeURIComponent(org.name)}`,
      action: "Company",
    })),
    ...stats.bareLessons.slice(0, 3).map((lesson) => ({
      key: `lesson-${lesson.courseId}-${lesson.lessonTitle}`,
      kind: "catalog" as const,
      title: `${lesson.lessonTitle} has no video or handout`,
      detail: lesson.courseTitle,
      badge: "Lesson",
      tone: "warning" as const,
      href: `/courses/${lesson.courseId}`,
      action: "Open",
    })),
    ...stats.freePlans.slice(0, 3).map((plan) => ({
      key: `plan-${plan.id}`,
      kind: "catalog" as const,
      title: `${plan.name} has no price`,
      detail: "An active seat package is set to AED 0.",
      badge: "Package",
      tone: "warning" as const,
      href: "/packages",
      action: "Packages",
    })),
    stats.settingGaps.includes("issuer")
      ? {
          key: "issuer",
          kind: "catalog" as const,
          title: "Certificate issuer is empty",
          detail: "Certificates print this name. Add it in Settings.",
          badge: "Settings",
          tone: "warning" as const,
          href: "/settings",
          action: "Settings",
        }
      : null,
    stats.settingGaps.includes("email")
      ? {
          key: "contact-email",
          kind: "catalog" as const,
          title: "Public contact email is empty",
          detail: "The website and invoices use this address.",
          badge: "Settings",
          tone: "warning" as const,
          href: "/settings",
          action: "Settings",
        }
      : null,
  ].filter((item): item is NonNullable<typeof item> => Boolean(item));
  const attentionKey = adminAttention.map((item) => item.key).join("|");
  useEffect(() => {
    setHiddenAttention(new Set(attentionKey.split("|").filter((id) => id && snoozedToday(id))));
  }, [attentionKey]);
  const openAdminAttention = adminAttention.filter((item) => !hiddenAttention.has(item.key));
  const adminKinds = [
    openAdminAttention.some((item) => item.kind === "unpaid") ? { id: "unpaid", label: "Unpaid" } : null,
    openAdminAttention.some((item) => item.kind === "failed") ? { id: "failed", label: "Payments" } : null,
    openAdminAttention.some((item) => item.kind === "people") ? { id: "people", label: "People" } : null,
    openAdminAttention.some((item) => item.kind === "catalog") ? { id: "catalog", label: "Catalog" } : null,
  ].filter((item): item is { id: string; label: string } => Boolean(item));
  const showAdminFilters = openAdminAttention.length > 4 && adminKinds.length > 0;
  const visibleAdminAttention =
    attentionFilter === "all" ? openAdminAttention : openAdminAttention.filter((item) => item.kind === attentionFilter);

  function hideAdminAttention(key: string) {
    snoozeToday(key);
    setHiddenAttention((current) => new Set(current).add(key));
  }

  async function downloadInvoice(order: RecentOrder) {
    if (!order.invoiceId) return;
    setDownloading(order.id);
    try {
      await downloadFile(`/admin/invoices/${order.invoiceId}/pdf`, `${order.invoiceNumber || "invoice"}.pdf`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setDownloading(null);
    }
  }

  return (
    <AdminShell>
      {error ? (
        <div className="alert alert-danger radius-8 mb-24" role="alert">
          {error}
        </div>
      ) : null}

      {loading ? <DashboardSkeleton /> : null}

      {!loading ? (
        <div className="workiz-dash">
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
            <div>
              <h6 className="fw-semibold mb-0">Dashboard</h6>
              <p className="text-neutral-600 mt-4 mb-0">
                {stats.newNames.length > 0
                  ? `New this week: ${stats.newNames.join(", ")}.`
                  : "Courses, company seats, and paid revenue."}
              </p>
              {stats.mailNote ? <p className="text-sm text-danger-600 mt-8 mb-0">{stats.mailNote}</p> : null}
            </div>
            <div className="d-flex flex-wrap gap-2">
              <Link href="/courses" className="btn btn-primary-600 radius-8 px-20">
                Manage courses
              </Link>
              <a
                href={`${process.env.NEXT_PUBLIC_WEB_URL || "http://localhost:3000"}/courses`}
                className="btn btn-outline-primary-600 radius-8 px-20"
                target="_blank"
                rel="noreferrer"
              >
                View website
              </a>
            </div>
          </div>

          <div className="card shadow-1 radius-8">
            <div className="card-body p-0">
              <div className="px-20 py-16 border-bottom border-neutral-200">
                <h6 className="text-lg mb-0">Needs attention</h6>
              </div>
              <div className="p-20">
                {openAdminAttention.length === 0 ? (
                  <EmptyState message="Nothing needs attention today." />
                ) : (
                  <>
                    {showAdminFilters ? (
                      <div className="workiz-attention-filters">
                        <button type="button" className={`btn btn-sm radius-8 ${attentionFilter === "all" ? "btn-primary-600" : "btn-outline-primary-600"}`} onClick={() => setAttentionFilter("all")}>
                          All
                        </button>
                        {adminKinds.map((kind) => (
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
                      {visibleAdminAttention.map((item) => (
                        <div key={item.key} className={`workiz-attention-row${item.kind === "unpaid" || item.kind === "failed" ? " workiz-attention-row--overdue" : ""}`}>
                          <div className="workiz-attention-row__copy">
                            <div className="fw-medium">{item.title}</div>
                            <div className="text-sm text-secondary-light">{item.detail}</div>
                          </div>
                          <div className="workiz-attention-row__actions">
                            <StatusBadge label={item.badge} tone={item.tone} />
                            <button type="button" className="btn btn-sm btn-outline-primary-600 radius-8" onClick={() => hideAdminAttention(item.key)}>
                              Tomorrow
                            </button>
                            <Link href={item.href} className="btn btn-sm btn-primary-600 radius-8">
                              {item.action}
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

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
                    <h6 className="text-lg mb-0">Seats and catalog</h6>
                  </div>
                  <div className="p-20">
                    <p className="text-sm text-neutral-600 mb-8">Seats</p>
                    <div className="d-flex gap-2 mb-16">
                      {seatMix.map((item) =>
                        item.count > 0 ? (
                          <div
                            key={item.label}
                            className={`h-44-px ${item.color} rounded`}
                            style={{ width: `${Math.max(12, Math.round((item.count / seatTotal) * 100))}%` }}
                          />
                        ) : null,
                      )}
                    </div>
                    <p className="text-sm text-neutral-600 mb-8">Catalog</p>
                    <div className="d-flex gap-2">
                      {courseMix.map((item) =>
                        item.count > 0 ? (
                          <div
                            key={item.label}
                            className={`h-44-px ${item.color} rounded`}
                            style={{ width: `${Math.max(12, Math.round((item.count / courseTotal) * 100))}%` }}
                          />
                        ) : null,
                      )}
                    </div>
                    <div className="mt-32 d-flex flex-column gap-16">
                      {[...seatMix, ...courseMix].map((item) => (
                        <div key={item.label} className="d-flex align-items-center justify-content-between">
                          <div className="d-flex align-items-center gap-2">
                            <span className={`w-12-px h-12-px radius-2 ${item.color}`} />
                            <span className="text-neutral-600">{item.label}</span>
                          </div>
                          <span className="fw-semibold text-primary-light">{item.count}</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-sm text-secondary-light mt-24 mb-16">{seatPct}% of seats filled</p>
                    <Link href="/organizations" className="btn btn-outline-primary-600 radius-8 w-100">
                      Manage companies
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="row gy-4">
            <div className="col-xxl-8">
              <div className="card shadow-1 radius-8 h-100">
                <div className="card-body p-0">
                  <div className="d-flex flex-wrap align-items-center justify-content-between px-20 py-16 border-bottom border-neutral-200 gap-2">
                    <h6 className="text-lg mb-0">Revenue</h6>
                    <div className="d-flex flex-wrap gap-2">
                      <button
                        type="button"
                        className={`btn btn-sm radius-8 ${chartRange === "month" ? "btn-primary-600" : "btn-outline-primary-600"}`}
                        aria-pressed={chartRange === "month"}
                        onClick={() => setChartRange("month")}
                      >
                        This month
                      </button>
                      <button
                        type="button"
                        className={`btn btn-sm radius-8 ${chartRange === "year" ? "btn-primary-600" : "btn-outline-primary-600"}`}
                        aria-pressed={chartRange === "year"}
                        onClick={() => setChartRange("year")}
                      >
                        12 months
                      </button>
                    </div>
                  </div>
                  <div className="p-20">
                    <div ref={chartRef} className="workiz-admin-chart" />
                    {stats.monthSources.length > 0 ? (
                      <p className="text-sm text-neutral-600 mt-16 mb-0">
                        This month:{" "}
                        {stats.monthSources.map((source) => `${source.label} ${aed(source.amountCents)}`).join(" · ")}
                      </p>
                    ) : (
                      <p className="text-sm text-neutral-600 mt-16 mb-0">No paid orders this month.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="col-xxl-4">
              <div className="card shadow-1 radius-8 h-100">
                <div className="card-body p-20 d-flex flex-column">
                  <h6 className="text-lg mb-8">Quizzes</h6>
                  {stats.emptyQuizzes.length === 0 ? (
                    <p className="text-secondary-light mb-0">Every quiz has questions.</p>
                  ) : (
                    <ul className="mb-0 d-flex flex-column gap-2">
                      {stats.emptyQuizzes.map((quiz) => (
                        <li key={quiz.id}>
                          <Link href={quiz.courseId ? `/courses/${quiz.courseId}` : "/courses"} className="fw-medium text-primary-600">
                            {quiz.title}
                          </Link>
                          <span className="text-secondary-light"> has no questions.</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="row gy-4">
            <div className="col-xxl-6">
              <div className="card shadow-1 radius-8 h-100">
                <div className="card-body p-0">
                  <div className="d-flex flex-wrap align-items-center justify-content-between px-20 py-16 border-bottom border-neutral-200">
                    <h6 className="text-lg mb-0">Recent orders</h6>
                    <Link href="/orders" className="text-primary-600 fw-semibold text-sm">
                      View all
                    </Link>
                  </div>
                  <div className="p-20">
                    <div className="workiz-admin-table-wrap">
                      <table className="table workiz-dash-table mb-0">
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>Kind</th>
                            <th>Amount</th>
                            <th>Invoice</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stats.recentOrders.map((order) => (
                            <tr key={order.id}>
                              <td>
                                <Link href={`/orders?q=${encodeURIComponent(order.id)}`} className="workiz-dash-course-link">
                                  {order.created_at?.slice(0, 10) || "—"}
                                </Link>
                              </td>
                              <td>
                                <StatusBadge label={order.kind} tone="info" />
                              </td>
                              <td className="dirham-sign">{formatMoney(order.amount_cents, "aed")}</td>
                              <td>
                                {order.invoiceId ? (
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-outline-primary-600 radius-8"
                                    disabled={downloading === order.id}
                                    onClick={() => downloadInvoice(order)}
                                  >
                                    {downloading === order.id ? "Saving…" : "Download"}
                                  </button>
                                ) : (
                                  "—"
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {stats.recentOrders.length === 0 ? <EmptyState message="No paid orders yet." /> : null}
                  </div>
                </div>
              </div>
            </div>
            <div className="col-xxl-6">
              <div className="card shadow-1 radius-8 h-100">
                <div className="card-body p-0">
                  <div className="d-flex flex-wrap align-items-center justify-content-between px-20 py-16 border-bottom border-neutral-200">
                    <h6 className="text-lg mb-0">Courses</h6>
                    <Link href="/courses" className="text-primary-600 fw-semibold text-sm">
                      View all
                    </Link>
                  </div>
                  <div className="p-20">
                    <div className="workiz-admin-table-wrap">
                      <table className="table workiz-dash-table mb-0">
                        <thead>
                          <tr>
                            <th>Title</th>
                            <th>Status</th>
                            <th>Price</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stats.recentCourses.map((course) => (
                            <tr key={course.id}>
                              <td>
                                <Link href={`/courses/${course.id}`} className="workiz-dash-course-link">
                                  {course.title}
                                </Link>
                              </td>
                              <td>
                                <StatusBadge
                                  label={course.published ? "Published" : "Draft"}
                                  tone={course.published ? "success" : "warning"}
                                />
                              </td>
                              <td className="dirham-sign">{formatMoney(course.price_cents, "aed")}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {stats.recentCourses.length === 0 ? <EmptyState message="No courses yet." /> : null}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </AdminShell>
  );
}
