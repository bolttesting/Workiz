"use client";

import { useEffect, useRef, useState } from "react";
import type { Course } from "@workix/db/types";
import { CourseCard } from "@/components/CourseCard";

const AUTO_MS = 4500;

export function HomeCoursesCarousel({ courses }: { courses: Course[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const activeRef = useRef(0);

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const updateActive = () => {
      const slide = track.querySelector<HTMLElement>(".workiz-course-slide");
      if (!slide) return;
      const step = slide.offsetWidth + 24;
      const index = Math.round(track.scrollLeft / Math.max(step, 1));
      setActive(Math.max(0, Math.min(courses.length - 1, index)));
    };

    updateActive();
    track.addEventListener("scroll", updateActive, { passive: true });
    window.addEventListener("resize", updateActive);
    return () => {
      track.removeEventListener("scroll", updateActive);
      window.removeEventListener("resize", updateActive);
    };
  }, [courses.length]);

  function goTo(index: number) {
    const track = trackRef.current;
    if (!track) return;
    const slide = track.querySelector<HTMLElement>(".workiz-course-slide");
    const step = slide ? slide.offsetWidth + 24 : track.clientWidth;
    const next = ((index % courses.length) + courses.length) % courses.length;
    track.scrollTo({ left: next * step, behavior: "smooth" });
    setActive(next);
  }

  useEffect(() => {
    if (courses.length <= 1 || paused) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;

    const id = window.setInterval(() => {
      goTo(activeRef.current + 1);
    }, AUTO_MS);

    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- goTo reads latest DOM; interval keyed on pause/length
  }, [courses.length, paused]);

  if (!courses.length) return null;

  return (
    <div
      className="workiz-courses-carousel"
      data-reveal
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setPaused(false);
        }
      }}
      onTouchStart={() => setPaused(true)}
      onTouchEnd={() => {
        window.setTimeout(() => setPaused(false), 5000);
      }}
    >
      <div ref={trackRef} className="workiz-courses-carousel__track">
        {courses.map((course, index) => (
          <div key={course.id} className="workiz-course-slide">
            <CourseCard course={course} />
          </div>
        ))}
      </div>

      {courses.length > 1 ? (
        <div className="workiz-courses-carousel__dots" role="tablist" aria-label="Course slides">
          {courses.map((course, index) => (
            <button
              key={course.id}
              type="button"
              role="tab"
              aria-selected={active === index}
              aria-label={`Show course ${index + 1}`}
              className={`workiz-courses-carousel__dot${active === index ? " is-active" : ""}`}
              onClick={() => goTo(index)}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
