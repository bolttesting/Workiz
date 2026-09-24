"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { COURSE_DEPARTMENTS, courseDepartment } from "@workix/config";
import type { Course } from "@workix/db/types";
import { CourseCard } from "@/components/CourseCard";

type Props = {
  courses: Course[];
};

export function CoursesCatalog({ courses }: Props) {
  const [query, setQuery] = useState("");
  const [department, setDepartment] = useState<string>("all");

  const departments = useMemo(() => {
    const present = new Set(courses.map((course) => courseDepartment(course)));
    const ordered = [
      ...COURSE_DEPARTMENTS.filter((name) => present.has(name)),
      ...Array.from(present).filter(
        (name) => !(COURSE_DEPARTMENTS as readonly string[]).includes(name),
      ),
    ];
    return ["all", ...ordered];
  }, [courses]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return courses.filter((course) => {
      const dept = courseDepartment(course);
      if (department !== "all" && dept.toLowerCase() !== department.toLowerCase()) {
        return false;
      }
      if (!q) return true;
      const tags = (course.tags ?? []).join(" ");
      const haystack = [course.title, course.subtitle, course.description, dept, tags]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [courses, department, query]);

  return (
    <div className="workiz-courses">
      <div className="workiz-courses__toolbar">
        <label className="workiz-courses__search">
          <span className="visually-hidden">Search courses</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search courses…"
          />
        </label>

        <div className="workiz-courses__filters" role="group" aria-label="Filter by department">
          {departments.map((item) => {
            const active = department === item;
            const label = item === "all" ? "All departments" : item;
            return (
              <button
                key={item}
                type="button"
                className={`workiz-courses__filter${active ? " is-active" : ""}`}
                aria-pressed={active}
                onClick={() => setDepartment(item)}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <p className="workiz-courses__count">
        {filtered.length} {filtered.length === 1 ? "course" : "courses"}
        {department !== "all" ? ` · ${department}` : ""}
      </p>

      {filtered.length ? (
        <div className="row workiz-courses__grid">
          {filtered.map((course) => (
            <div className="col-xl-4 col-lg-6 col-md-6" key={course.id}>
              <CourseCard course={course} />
            </div>
          ))}
        </div>
      ) : (
        <div className="workiz-courses__empty">
          <h3>No courses match</h3>
          <p>Try another search or department filter.</p>
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setDepartment("all");
            }}
          >
            Clear filters
          </button>
        </div>
      )}

      <div className="workiz-courses__cta">
        <div>
          <h3>Training for your whole company</h3>
          <p>Contract seats, then let admins assign the right courses by department.</p>
        </div>
        <Link href="/pricing" className="workiz-courses__cta-btn">
          View company seats
        </Link>
      </div>
    </div>
  );
}
