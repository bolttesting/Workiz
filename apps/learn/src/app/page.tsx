"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LearnShell } from "@/components/LearnShell";
import { apiClient } from "@/lib/api";
import type { Course } from "@workix/db/types";

export default function LearnHome() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiClient<{ courses: Course[] }>("/me/enrollments")
      .then((res) => setCourses(res.courses))
      .catch(async () => {
        try {
          const catalog = await apiClient<{ courses: Course[] }>("/courses");
          setCourses(catalog.courses);
        } catch (err) {
          setError((err as Error).message);
        }
      });
  }, []);

  return (
    <LearnShell>
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-24">
        <h6 className="fw-semibold mb-0">My courses</h6>
      </div>
      {error ? <p className="text-danger">{error}</p> : null}
      <div className="row gy-4">
        {courses.map((course) => (
          <div className="col-xl-4 col-sm-6" key={course.id}>
            <div className="card h-100 radius-12">
              <img src={course.thumbnail_url || "/assets/images/thumbs/leave-request-img2.png"} className="card-img-top" alt="" />
              <div className="card-body">
                <h6>{course.title}</h6>
                <p className="text-secondary-light">{course.subtitle}</p>
                <Link className="btn btn-primary-600" href={`/courses/${course.slug}`}>
                  Continue
                </Link>
              </div>
            </div>
          </div>
        ))}
        {courses.length === 0 && !error ? <p>No enrollments yet. Buy a course or wait for a company seat.</p> : null}
      </div>
    </LearnShell>
  );
}
