"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LearnShell } from "@/components/LearnShell";
import { EmptyState, LearnDataCard, LearnPageHeader, LoadingState, StatusBadge } from "@/components/LearnUi";
import { apiClient } from "@/lib/api";
import type { Course, Enrollment, Lesson, ModuleRow } from "@workix/db/types";

type ProgressRow = { lesson_id: string; completed: boolean };

type CourseRow = {
  course: Course;
  source: Enrollment["source"];
  dueAt: string | null;
  waitingOn: string | null;
  done: number;
  total: number;
  nextLesson: string | null;
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

export default function MyCoursesPage() {
  const [rows, setRows] = useState<CourseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      apiClient<{
        enrollments: Enrollment[];
        courses: Course[];
        gates?: Record<string, { title: string } | null>;
        outlines?: Record<string, { id: string; title: string }[]>;
      }>("/me/enrollments"),
      apiClient<{ progress: ProgressRow[] }>("/me/progress"),
    ])
      .then(async ([owned, progress]) => {
        const completed = new Set(progress.progress.filter((row) => row.completed).map((row) => row.lesson_id));
        const byCourse = new Map(owned.courses.map((course) => [course.id, course]));
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
            return {
              course,
              source: enrollment.source,
              dueAt: enrollment.due_at ? enrollment.due_at.slice(0, 10) : null,
              waitingOn: owned.gates?.[course.id]?.title ?? null,
              done,
              total,
              nextLesson: next?.title ?? null,
              status,
            } satisfies CourseRow;
          }),
        );
        if (cancelled) return;
        const present = built.filter((row): row is CourseRow => row !== null);
        present.sort((a, b) => rank(a.status) - rank(b.status) || a.course.title.localeCompare(b.course.title));
        setRows(present);
        setError(null);
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

  return (
    <LearnShell>
      <LearnPageHeader
        title="My courses"
        description="Courses you purchased or were assigned. Open one to continue learning."
      />
      {error ? (
        <div className="alert alert-danger radius-8 mb-24" role="alert">
          {error}
        </div>
      ) : null}
      <LearnDataCard title="Courses you can open">
        {loading ? <LoadingState message="Loading your courses…" /> : null}
        {!loading ? (
          <div className="workiz-admin-table-wrap">
            <table className="table bordered-table mb-0">
              <thead>
                <tr>
                  <th>Course</th>
                  <th>Access</th>
                  <th>Progress</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const badge = statusLabel(row.status);
                  return (
                    <tr key={row.course.id}>
                      <td>
                        <div className="fw-medium text-primary-light">{row.course.title}</div>
                        {row.nextLesson && row.status !== "done" ? (
                          <div className="text-secondary-light text-sm">Next: {row.nextLesson}</div>
                        ) : null}
                        {row.dueAt ? <div className="text-secondary-light text-sm">Due {row.dueAt}</div> : null}
                        {row.waitingOn ? <div className="text-secondary-light text-sm">Finish {row.waitingOn} first</div> : null}
                      </td>
                      <td>
                        <StatusBadge label={row.source === "seat" ? "Assigned" : "Purchased"} tone="primary" />
                      </td>
                      <td>{row.total ? `${row.done} / ${row.total}` : "—"}</td>
                      <td>
                        <StatusBadge label={badge.label} tone={badge.tone} />
                      </td>
                      <td className="text-end">
                        <Link href={`/courses/${row.course.slug}`} className="btn btn-sm btn-primary-600 radius-8">
                          {row.status === "done" ? "Review" : "Continue"}
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {rows.length === 0 ? (
              <EmptyState message="You have no courses yet. Buy one from the website, or wait for a company seat." />
            ) : null}
          </div>
        ) : null}
      </LearnDataCard>
    </LearnShell>
  );
}
