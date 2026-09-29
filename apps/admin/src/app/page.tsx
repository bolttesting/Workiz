"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AdminShell } from "@/components/AdminShell";
import { DashboardSkeleton } from "@/components/DashboardSkeleton";
import { EmptyState, StatusBadge } from "@/components/AdminUi";
import { apiClient } from "@/lib/api";
import { DIRHAM_SIGN, formatMoney } from "@workix/config";

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
            formatter: (value: number) => `${DIRHAM_SIGN} ${value.toFixed(0)}`,
          },
        },
        tooltip: {
          theme: "light",
          y: { formatter: (value: number) => `${DIRHAM_SIGN} ${value.toFixed(2)}` },
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
  const seatsOpen = Math.max(0, stats.seatsLimit - stats.seatsUsed);
  const draftCourses = Math.max(0, stats.courses - stats.publishedCourses);
  const months = stats.revenueByMonth;
  const latest = months[months.length - 1];
  const previous = months.length > 1 ? months[months.length - 2] : undefined;
  const revenueDelta =
    latest && previous && previous.revenueCents > 0
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
      meta: `${stats.courses} in the catalog · ${stats.quizzes} quizzes`,
      icon: "ri-book-open-line",
      tint: "gradient-bg-end-5",
      bubble: "bg-success-600",
    },
    {
      label: "Revenue",
      value: formatMoney(stats.revenueCents, "aed"),
      meta:
        revenueDelta === null
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
              <p className="text-neutral-600 mt-4 mb-0">Courses, company seats, and paid revenue.</p>
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

          <div className="d-flex flex-wrap gap-2">
            {quickActions.map((item) => (
              <Link key={item.href} href={item.href} className="btn btn-outline-primary-600 radius-8 px-16 py-8 d-inline-flex align-items-center gap-2">
                <i className={item.icon} aria-hidden="true" />
                {item.label}
              </Link>
            ))}
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
                    <span className="fw-semibold text-primary-600 dirham-sign">{formatMoney(stats.revenueCents, "aed")}</span>
                  </div>
                  <div className="p-20">
                    <div ref={chartRef} className="workiz-admin-chart" />
                  </div>
                </div>
              </div>
            </div>
            <div className="col-xxl-4">
              <div className="card shadow-1 radius-8 h-100">
                <div className="card-body p-20 d-flex flex-column">
                  <h6 className="text-lg mb-8">Quizzes</h6>
                  <p className="text-secondary-light mb-16">Open a course, then Curriculum, and add a lecture with type Quiz.</p>
                  <p className="fw-semibold text-primary-light mb-24">{stats.quizzes} quizzes in the catalog</p>
                  <Link href="/courses" className="btn btn-outline-primary-600 radius-8 w-100 mt-auto">
                    Open courses
                  </Link>
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
                          </tr>
                        </thead>
                        <tbody>
                          {stats.recentOrders.map((order) => (
                            <tr key={order.id}>
                              <td>{order.created_at?.slice(0, 10) || "—"}</td>
                              <td>
                                <StatusBadge label={order.kind} tone="info" />
                              </td>
                              <td className="dirham-sign">{formatMoney(order.amount_cents, "aed")}</td>
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
