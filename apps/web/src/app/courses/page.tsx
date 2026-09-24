import { SiteFooter, SiteHeader, Breadcrumb } from "@/components/SiteChrome";
import { CoursesCatalog } from "@/components/CoursesCatalog";
import { publicApi } from "@/lib/session";
import type { Course } from "@workix/db/types";

async function loadCourses(): Promise<Course[]> {
  try {
    const res = await fetch(`${publicApi()}/courses`, { cache: "no-store" });
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
            <p className="workiz-courses-page__eyebrow">COURSE CATALOG</p>
            <h1 className="workiz-courses-page__title">Training built for modern teams</h1>
            <p className="workiz-courses-page__lede">
              Practical programs your company can assign by role or department — language, culture,
              professional skills, and specialized training.
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
