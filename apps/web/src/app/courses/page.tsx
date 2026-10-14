import type { Metadata } from "next";
import { SiteFooter, SiteHeader, Breadcrumb } from "@/components/SiteChrome";
import { CoursesCatalog } from "@/components/CoursesCatalog";
import { publicApi } from "@/lib/session";
import type { Course } from "@workix/db/types";

export const metadata: Metadata = { title: "Courses", description: "Browse WORKIZ courses. Buy one for yourself, or assign the same catalog to your team with company seats." };

async function loadCourses(): Promise<Course[]> {
  try {
    const res = await fetch(`${publicApi()}/courses`, { next: { revalidate: 60 } });
    if (!res.ok) return [];
    const json = await res.json();
    return json.courses ?? [];
  } catch {
    return [];
  }
}

export default async function CoursesPage() {
  const courses = await loadCourses();

  return (
    <>
      <SiteHeader />
      <Breadcrumb title="Courses" crumb="Courses" />

      <section className="workiz-courses-page">
        <div className="container">
          <div className="workiz-courses-page__intro">
            <h1 className="workiz-courses-page__title">Courses</h1>
            <p className="workiz-courses-page__lede">
              Buy a course for yourself. Companies use the same catalog and assign it from a seat plan.
            </p>
          </div>

          {courses.length ? (
            <CoursesCatalog courses={courses} />
          ) : (
            <div className="workiz-courses__empty">
              <h3>No published courses yet</h3>
              <p>New programs will appear here once they are published in admin.</p>
            </div>
          )}
        </div>
      </section>

      <SiteFooter />
    </>
  );
}
