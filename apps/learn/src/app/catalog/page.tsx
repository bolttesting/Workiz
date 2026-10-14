"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { LearnShell } from "@/components/LearnShell";
import {
  EmptyState,
  LearnDataCard,
  LearnPageHeader,
  LoadingState,
  Pagination,
  StatusBadge,
  usePagination,
} from "@/components/LearnUi";
import { apiClient } from "@/lib/api";
import { formatMoney } from "@workix/config";
import type { Course, Enrollment, Profile } from "@workix/db/types";

const web = process.env.NEXT_PUBLIC_WEB_URL ?? "http://localhost:3000";

type CatalogFact = {
  lessons: number;
  durationSeconds: number;
  hasQuiz: boolean;
  certificateMonths: number | null;
  assigned: number;
  assignedIds: string[];
};
type CatalogPerson = { id: string; name: string; email: string; department: string | null };
type CatalogExtra = {
  learnerCount: number;
  departments: string[];
  people: CatalogPerson[];
  courses: (CatalogFact & { id: string })[];
};

function lengthLabel(seconds: number) {
  if (seconds <= 0) return null;
  const minutes = Math.max(1, Math.round(seconds / 60));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} hr ${rest} min` : `${hours} hr`;
}

function containsLine(fact: CatalogFact) {
  const parts = [`${fact.lessons} ${fact.lessons === 1 ? "lesson" : "lessons"}`];
  const length = lengthLabel(fact.durationSeconds);
  if (length) parts.push(length);
  parts.push(fact.hasQuiz ? "Quiz" : "No quiz");
  parts.push(fact.certificateMonths && fact.certificateMonths > 0 ? `Certificate ${fact.certificateMonths} months` : "Certificate does not expire");
  return parts.join(" · ");
}

export default function CatalogPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [ownedIds, setOwnedIds] = useState<Set<string>>(new Set());
  const [role, setRole] = useState<Profile["role"] | null>(null);
  const [query, setQuery] = useState("");
  const [requested, setRequested] = useState<Set<string>>(new Set());
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [facts, setFacts] = useState<Record<string, CatalogFact>>({});
  const [people, setPeople] = useState<CatalogPerson[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [learnerCount, setLearnerCount] = useState(0);
  const [assignCourse, setAssignCourse] = useState<string | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [department, setDepartment] = useState("");
  const [dueOn, setDueOn] = useState("");
  const [assigning, setAssigning] = useState(false);

  function applyCatalog(extra: CatalogExtra) {
    const next: Record<string, CatalogFact> = {};
    for (const course of extra.courses) {
      next[course.id] = course;
    }
    setFacts(next);
    setPeople(extra.people);
    setDepartments(extra.departments);
    setLearnerCount(extra.learnerCount);
  }

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
        if (me.profile.role === "company_admin") {
          const extra = await apiClient<CatalogExtra>("/orgs/catalog");
          if (!cancelled) applyCatalog(extra);
        }
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
  const limited = individual;
  const visible = useMemo(() => {
    const base = limited ? courses.filter((course) => ownedIds.has(course.id)) : courses;
    const q = query.trim().toLowerCase();
    if (!q) return base;
    return base.filter((course) =>
      [course.title, course.subtitle, course.level, ...(course.tags ?? [])].some((value) => (value ?? "").toLowerCase().includes(q)),
    );
  }, [courses, ownedIds, limited, query]);

  const catalogPage = usePagination(visible, 20);
  return (
    <LearnShell>
      <LearnPageHeader
        title="Catalog"
        description={
          reviewing
            ? "Preview a course, then assign it to people or a department."
            : companyLearner
              ? "Assigned courses open immediately. Ask your admin to assign any other course."
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
      {notice ? (
        <div className="alert alert-success radius-8 mb-24" role="status">
          {notice}
        </div>
      ) : null}
      {error ? (
        <div className="alert alert-danger radius-8 mb-24" role="alert">
          {error}
        </div>
      ) : null}
      <LearnDataCard
        title={individual ? "Your courses" : companyLearner ? "Company catalog" : "Published courses"}
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
                  {reviewing ? <th>Contains</th> : <th>Level</th>}
                  {reviewing ? <th>Assigned</th> : <th>Price</th>}
                  {reviewing ? null : <th>Access</th>}
                  <th />
                </tr>
              </thead>
              <tbody>
                {catalogPage.pageItems.map((course) => {
                  const owned = ownedIds.has(course.id);
                  const fact = facts[course.id];
                  return (
                    <Fragment key={course.id}>
                    <tr>
                      <td>
                        <div className="fw-medium text-primary-light">{course.title}</div>
                        {course.subtitle ? <div className="text-secondary-light text-sm">{course.subtitle}</div> : null}
                      </td>
                      {reviewing ? (
                        <td className="text-sm">{fact ? containsLine(fact) : "—"}</td>
                      ) : (
                        <td>{course.level || "—"}</td>
                      )}
                      {reviewing ? (
                        <td>{fact ? `${fact.assigned} of ${learnerCount}` : "—"}</td>
                      ) : (
                        <td className="dirham-sign">{formatMoney(course.price_cents, "aed")}</td>
                      )}
                      {reviewing ? null : (
                      <td>
                        <StatusBadge
                          label={
                            owned
                              ? individual
                                ? "Purchased"
                                : "Assigned"
                              : requested.has(course.id)
                                ? "Requested"
                                : "Ask your admin"
                          }
                          tone={owned ? "success" : requested.has(course.id) ? "warning" : "neutral"}
                        />
                      </td>
                      )}
                      <td className="text-end">
                        <div className="d-flex justify-content-end gap-2">
                        {reviewing ? (
                          <button
                            type="button"
                            className="btn btn-sm btn-primary-600 radius-8"
                            onClick={() => {
                              setAssignCourse((current) => (current === course.id ? null : course.id));
                              setPicked(new Set());
                              setDepartment("");
                              setError(null);
                            }}
                          >
                            {assignCourse === course.id ? "Close" : "Assign"}
                          </button>
                        ) : null}
                        {owned || reviewing ? (
                          <Link href={`/courses/${course.slug}`} className="btn btn-sm btn-outline-primary-600 radius-8">
                            {reviewing ? "Preview" : "Open"}
                          </Link>
                        ) : companyLearner ? (
                          <button
                            type="button"
                            className="btn btn-sm btn-primary-600 radius-8"
                            disabled={requested.has(course.id)}
                            onClick={() => {
                              void apiClient("/orgs/requests", { method: "POST", body: JSON.stringify({ courseId: course.id }) })
                                .then(() => {
                                  setRequested((current) => new Set(current).add(course.id));
                                  setNotice(`Asked your admin to assign ${course.title}.`);
                                })
                                .catch((err) => setError((err as Error).message));
                            }}
                          >
                            {requested.has(course.id) ? "Requested" : "Request"}
                          </button>
                        ) : null}
                        </div>
                      </td>
                    </tr>
                    {reviewing && assignCourse === course.id ? (
                      <tr>
                        <td colSpan={4}>
                          <form
                            className="d-flex flex-column gap-3 py-8"
                            onSubmit={(event) => {
                              event.preventDefault();
                              if (!department && picked.size === 0) {
                                setError("Choose people or a department.");
                                return;
                              }
                              setAssigning(true);
                              setError(null);
                              setNotice(null);
                              void apiClient<{ title: string; assigned: number }>("/orgs/assign", {
                                method: "POST",
                                body: JSON.stringify({
                                  courseId: course.id,
                                  memberIds: department ? undefined : [...picked],
                                  department: department || undefined,
                                  dueAt: dueOn || undefined,
                                }),
                              })
                                .then(async (res) => {
                                  setNotice(`Assigned ${res.title} to ${res.assigned} ${res.assigned === 1 ? "person" : "people"}.`);
                                  setAssignCourse(null);
                                  setPicked(new Set());
                                  setDepartment("");
                                  const extra = await apiClient<CatalogExtra>("/orgs/catalog");
                                  applyCatalog(extra);
                                })
                                .catch((err) => setError((err as Error).message))
                                .finally(() => setAssigning(false));
                            }}
                          >
                            {people.length === 0 ? <p className="mb-0 text-secondary-light">Invite people from Team before assigning.</p> : null}
                            {departments.length > 0 ? (
                              <label className="d-flex flex-column gap-1">
                                <span className="fw-medium">Department</span>
                                <select className="form-select radius-8" value={department} onChange={(event) => setDepartment(event.target.value)}>
                                  <option value="">Choose people below</option>
                                  {departments.map((name) => (
                                    <option key={name} value={name}>
                                      {name}
                                    </option>
                                  ))}
                                </select>
                              </label>
                            ) : null}
                            {department ? (
                              <p className="mb-0 text-secondary-light">Everyone in {department}, including people who already have this course.</p>
                            ) : (
                              <div className="d-flex flex-column gap-2">
                                {people.map((person) => {
                                  const already = fact?.assignedIds.includes(person.id);
                                  return (
                                    <label key={person.id} className="d-flex align-items-center gap-2 mb-0">
                                      <input
                                        type="checkbox"
                                        checked={already || picked.has(person.id)}
                                        disabled={already}
                                        onChange={(event) => {
                                          setPicked((current) => {
                                            const next = new Set(current);
                                            if (event.target.checked) next.add(person.id);
                                            else next.delete(person.id);
                                            return next;
                                          });
                                        }}
                                      />
                                      <span>
                                        {person.name}
                                        {person.email && person.name !== person.email ? <span className="text-secondary-light"> · {person.email}</span> : null}
                                        {person.department ? <span className="text-secondary-light"> · {person.department}</span> : null}
                                        {already ? <span className="text-secondary-light"> · Already assigned</span> : null}
                                      </span>
                                    </label>
                                  );
                                })}
                              </div>
                            )}
                            <label className="d-flex flex-column gap-1">
                              <span className="fw-medium">Due date</span>
                              <input className="form-control radius-8" type="date" value={dueOn} onChange={(event) => setDueOn(event.target.value)} />
                            </label>
                            <div className="d-flex gap-2">
                              <button type="submit" className="btn btn-primary-600 radius-8" disabled={assigning || people.length === 0}>
                                {assigning ? "Assigning…" : "Assign"}
                              </button>
                              <button type="button" className="btn btn-outline-primary-600 radius-8" onClick={() => setAssignCourse(null)}>
                                Cancel
                              </button>
                            </div>
                          </form>
                        </td>
                      </tr>
                    ) : null}
                    </Fragment>
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
            <Pagination page={catalogPage.page} pageSize={catalogPage.pageSize} total={catalogPage.total} onPageChange={catalogPage.setPage} label="courses" />
          </div>
        ) : null}
      </LearnDataCard>
    </LearnShell>
  );
}
