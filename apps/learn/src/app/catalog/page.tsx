"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { LearnShell } from "@/components/LearnShell";
import { EmptyState, LearnDataCard, LearnPageHeader, LoadingState, StatusBadge } from "@/components/LearnUi";
import { apiClient } from "@/lib/api";
import { formatMoney } from "@workix/config";
import type { Course, Enrollment, Profile } from "@workix/db/types";

const web = process.env.NEXT_PUBLIC_WEB_URL ?? "http://localhost:3000";

export default function CatalogPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [ownedIds, setOwnedIds] = useState<Set<string>>(new Set());
  const [role, setRole] = useState<Profile["role"] | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    apiClient<{ profile: Profile }>("/me")
      .then(async (me) => {
        if (cancelled) return;
        const [catalog, owned] = await Promise.all([
          apiClient<{ courses: Course[] }>("/courses"),
          apiClient<{ enrollments: Enrollment[] }>("/me/enrollments"),
        ]);
        if (cancelled) return;
        setCourses(catalog.courses);
        setRole(me.profile.role);
        setOwnedIds(new Set(owned.enrollments.map((row) => row.course_id)));
        setError(null);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError((err as Error).message);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const individual = role === "individual_learner";
  const companyLearner = role === "company_learner";
  const reviewing = role === "company_admin";
  const limited = individual || companyLearner;
  const visible = useMemo(() => {
    const base = limited ? courses.filter((course) => ownedIds.has(course.id)) : courses;
    const q = query.trim().toLowerCase();
    if (!q) return base;
    return base.filter((course) =>
      [course.title, course.subtitle, course.level, ...(course.tags ?? [])].some((value) => (value ?? "").toLowerCase().includes(q)),
    );
  }, [courses, ownedIds, limited, query]);

  return (
    <LearnShell>
      <LearnPageHeader
        title="Catalog"
        description={
          reviewing
            ? "Every published course. Open one if you want to test a lecture."
            : companyLearner
              ? "Courses your company admin assigned to you."
              : individual
                ? "Only the course you purchased. Buy another from the website if you want a second one."
                : "Published courses."
        }
        action={
          individual ? (
            <a href={`${web}/courses`} className="btn btn-outline-primary-600 radius-8 px-16">
              Buy a course
            </a>
          ) : null
        }
      />
      {error ? (
        <div className="alert alert-danger radius-8 mb-24" role="alert">
          {error}
        </div>
      ) : null}
      <LearnDataCard
        title={limited ? "Your courses" : "Published courses"}
        toolbar={
          <div className="navbar-search mb-0" style={{ maxWidth: 280 }}>
            <input
              type="search"
              className="bg-transparent"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search courses…"
              aria-label="Search courses"
            />
            <i className="ri-search-line icon" />
          </div>
        }
      >
        {loading ? <LoadingState /> : null}
        {!loading ? (
          <div className="workiz-admin-table-wrap">
            <table className="table bordered-table mb-0">
              <thead>
                <tr>
                  <th>Course</th>
                  <th>Level</th>
                  <th>Price</th>
                  <th>Access</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {visible.map((course) => {
                  const owned = ownedIds.has(course.id);
                  return (
                    <tr key={course.id}>
                      <td>
                        <div className="fw-medium text-primary-light">{course.title}</div>
                        {course.subtitle ? <div className="text-secondary-light text-sm">{course.subtitle}</div> : null}
                      </td>
                      <td>{course.level || "—"}</td>
                      <td className="dirham-sign">{formatMoney(course.price_cents, "aed")}</td>
                      <td>
                        <StatusBadge
                          label={reviewing ? "Preview" : owned ? (individual ? "Purchased" : "Assigned") : "Not assigned"}
                          tone={reviewing || owned ? "success" : "neutral"}
                        />
                      </td>
                      <td className="text-end">
                        {owned || reviewing ? (
                          <Link href={`/courses/${course.slug}`} className="btn btn-sm btn-outline-primary-600 radius-8">
                            Open
                          </Link>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {visible.length === 0 ? (
              <EmptyState
                message={
                  companyLearner
                    ? "No course has been assigned to you yet."
                    : individual
                      ? "You have not purchased a course yet."
                      : "No courses match your search."
                }
              />
            ) : null}
          </div>
        ) : null}
      </LearnDataCard>
    </LearnShell>
  );
}
