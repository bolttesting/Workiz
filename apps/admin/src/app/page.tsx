"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AdminShell } from "@/components/AdminShell";
import { EmptyState, LoadingState, StatusBadge } from "@/components/AdminUi";
import { apiClient } from "@/lib/api";
import { formatMoney } from "@workix/config";

type RevenueMonth = { month: string; revenueCents: number; orders: number };
type RecentOrder = {
  id: string;
  kind: string;
  status: string;
  amount_cents: number;
  currency: string;
  created_at: string;
};
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
  recentOrders: RecentOrder[];
  recentCourses: RecentCourse[];
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
  recentOrders: [],
  recentCourses: [],
};

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

const quickActions = [
  { href: "/courses", label: "New course", hint: "Curriculum, quizzes, publish", icon: "ri-graduation-cap-fill" },
  { href: "/blog", label: "Write blog", hint: "SEO posts for the site", icon: "ri-quill-pen-fill" },
  { href: "/organizations", label: "Companies", hint: "Seats and assignments", icon: "ri-building-4-fill" },
  { href: "/orders", label: "Orders", hint: "Paid checkouts", icon: "ri-shopping-bag-3-fill" },
];

export default function AdminHome() {
  const [stats, setStats] = useState<Stats>(emptyStats);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
      const labels = stats.revenueByMonth.map((row) => monthLabel(row.month));
      const series = stats.revenueByMonth.map((row) => Number((row.revenueCents / 100).toFixed(2)));
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
            formatter: (value: number) => `$${value.toFixed(0)}`,
          },
        },
        tooltip: {
          theme: "light",
          y: { formatter: (value: number) => `$${value.toFixed(2)}` },
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
  }, [stats.revenueByMonth]);

  const seatPct =
    stats.seatsLimit > 0 ? Math.min(100, Math.round((stats.seatsUsed / stats.seatsLimit) * 100)) : 0;

  const metrics = [
    { label: "Learners & admins", value: stats.users.toLocaleString(), meta: "All profiles", icon: "ri-user-3-line" },
    { label: "Companies", value: stats.orgs.toLocaleString(), meta: "Seat accounts", icon: "ri-building-line" },
    {
      label: "Live courses",
      value: `${stats.publishedCourses}`,
      meta: `${stats.courses} total · ${stats.quizzes} quizzes`,
      icon: "ri-book-open-line",
    },
    {
      label: "Revenue",
      value: formatMoney(stats.revenueCents, "usd"),
      meta: `${stats.orders} paid orders`,
      icon: "ri-money-dollar-circle-line",
    },
  ];

  return (
    <AdminShell>
      {error ? (
        <div className="alert alert-danger radius-8 mb-24" role="alert">
          {error}
        </div>
      ) : null}

      {loading ? <LoadingState message="Loading dashboard…" /> : null}

      {!loading ? (
        <div className="workiz-dash">
          <section className="workiz-dash-hero">
            <div className="workiz-dash-hero__copy">
              <p className="workiz-dash-hero__eyebrow">WORKIZ OPERATIONS</p>
              <h1 className="workiz-dash-hero__title">Command center</h1>
              <p className="workiz-dash-hero__lede">
                Publish courses, build quizzes in the curriculum, and keep seats and revenue in view.
              </p>
            </div>
            <div className="workiz-dash-hero__actions">
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
          </section>

          <section className="workiz-dash-actions" aria-label="Quick actions">
            {quickActions.map((item) => (
              <Link key={item.href} href={item.href} className="workiz-dash-action">
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

          <section className="workiz-dash-metrics" aria-label="Key metrics">
            {metrics.map((m) => (
              <article key={m.label} className="workiz-dash-metric">
                <div className="workiz-dash-metric__top">
                  <span className="workiz-dash-metric__icon" aria-hidden="true">
                    <i className={m.icon} />
                  </span>
                  <span className="workiz-dash-metric__label">{m.label}</span>
                </div>
                <p className="workiz-dash-metric__value">{m.value}</p>
                <p className="workiz-dash-metric__meta">{m.meta}</p>
              </article>
            ))}
          </section>

          <div className="row gy-4">
            <div className="col-xxl-8">
              <div className="workiz-dash-panel">
                <div className="workiz-dash-panel__head">
                  <div>
                    <h2>Revenue</h2>
                    <p>Paid checkout total over the last 12 months</p>
                  </div>
                  <span className="workiz-dash-panel__pill dirham-sign">
                    {formatMoney(stats.revenueCents, "usd")}
                  </span>
                </div>
                <div ref={chartRef} className="workiz-admin-chart" />
              </div>
            </div>
            <div className="col-xxl-4">
              <div className="workiz-dash-panel workiz-dash-panel--seat h-100">
                <div className="workiz-dash-panel__head">
                  <div>
                    <h2>Seat capacity</h2>
                    <p>Across all company accounts</p>
                  </div>
                </div>
                <p className="workiz-dash-seat__figure">
                  {stats.seatsUsed}
                  <span> / {stats.seatsLimit || 0}</span>
                </p>
                <div className="workiz-dash-seat__bar" role="progressbar" aria-valuenow={seatPct} aria-valuemin={0} aria-valuemax={100}>
                  <span style={{ width: `${seatPct}%` }} />
                </div>
                <p className="workiz-dash-seat__pct">{seatPct}% used</p>
                <Link href="/organizations" className="btn btn-outline-primary-600 radius-8 w-100 mt-auto">
                  Manage companies
                </Link>
              </div>
            </div>
          </div>

          <div className="row gy-4 mt-1">
            <div className="col-xxl-6">
              <div className="workiz-dash-panel">
                <div className="workiz-dash-panel__head">
                  <div>
                    <h2>Recent orders</h2>
                    <p>Latest paid checkouts</p>
                  </div>
                  <Link href="/orders" className="workiz-dash-panel__link">
                    View all
                  </Link>
                </div>
                <div className="workiz-admin-table-wrap">
                  <table className="table workiz-dash-table mb-0">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Kind</th>
                        <th>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.recentOrders.map((order) => (
                        <tr key={order.id}>
                          <td>{order.created_at?.slice(0, 10) || "—"}</td>
                          <td>
                            <StatusBadge label={order.kind} tone="info" />
                          </td>
                          <td className="dirham-sign">{formatMoney(order.amount_cents, order.currency)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {stats.recentOrders.length === 0 ? <EmptyState message="No paid orders yet." /> : null}
              </div>
            </div>
            <div className="col-xxl-6">
              <div className="workiz-dash-panel">
                <div className="workiz-dash-panel__head">
                  <div>
                    <h2>Courses</h2>
                    <p>Edit curriculum &amp; quizzes inside each course</p>
                  </div>
                  <Link href="/courses" className="workiz-dash-panel__link">
                    View all
                  </Link>
                </div>
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
                          <td className="dirham-sign">{formatMoney(course.price_cents, course.currency)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {stats.recentCourses.length === 0 ? <EmptyState message="No courses yet." /> : null}
                <div className="workiz-dash-tip">
                  <i className="ri-questionnaire-line" aria-hidden="true" />
                  <p>
                    <strong>Quizzes live in Curriculum.</strong> Open a course → tab 3 → add a lecture with type{" "}
                    <em>Quiz</em>. The question editor opens automatically.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </AdminShell>
  );
}
