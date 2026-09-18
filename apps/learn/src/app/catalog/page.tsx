"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LearnShell } from "@/components/LearnShell";
import { apiClient } from "@/lib/api";
import type { Course } from "@workix/db/types";

export default function CatalogPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  useEffect(() => {
    apiClient<{ courses: Course[] }>("/courses").then((r) => setCourses(r.courses)).catch(() => undefined);
  }, []);
  return (
    <LearnShell>
      <h6 className="mb-24">Full catalog</h6>
      <p className="text-secondary-light">Company seats can open any published course. Individuals only see purchased ones in My courses.</p>
      <div className="row gy-4">
        {courses.map((course) => (
          <div className="col-md-4" key={course.id}>
            <div className="card radius-12">
              <div className="card-body">
                <h6>{course.title}</h6>
                <Link href={`/courses/${course.slug}`}>Open</Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </LearnShell>
  );
}
