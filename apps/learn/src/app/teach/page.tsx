"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LearnShell } from "@/components/LearnShell";
import { LoadingState } from "@/components/LearnUi";
import { apiClient } from "@/lib/api";
import type { Course } from "@workix/db/types";

export default function TeachPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    apiClient<{ courses: Course[] }>("/instructor/courses")
      .then((r) => setCourses(r.courses))
      .catch((err) => setError((err as Error).message))
      .finally(() => setReady(true));
  }, []);

  return (
    <LearnShell>
      <h6 className="mb-24">Teaching</h6>
      <p className="text-secondary-light mb-24">Courses assigned to you. Review content and track student progress.</p>
      {error ? <p className="text-danger">{error}</p> : null}
      {!ready ? <LoadingState message="Loading courses…" rows={4} /> : null}
      {ready ? (
      <div className="row gy-4">
        {courses.map((course) => (
          <div className="col-md-4" key={course.id}>
            <div className="card radius-12">
              <div className="card-body">
                <h6>{course.title}</h6>
                <p className="text-secondary-light">{course.published ? "Published" : "Draft"}</p>
                <div className="d-flex gap-2">
                  <Link className="btn btn-outline-primary-600" href={`/courses/${course.slug}`}>
                    Open course
                  </Link>
                  <Link className="btn btn-primary-600" href={`/teach/${course.id}`}>
                    Students
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ))}
        {courses.length === 0 && !error ? <p>No courses assigned yet. An admin must attach you to a course.</p> : null}
      </div>
      ) : null}
    </LearnShell>
  );
}
