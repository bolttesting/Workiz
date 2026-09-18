import { SiteFooter, SiteHeader, Breadcrumb } from "@/components/SiteChrome";
import { publicApi } from "@/lib/session";
import { CourseCard } from "@/components/CourseCard";
import type { Course } from "@workix/db/types";

async function loadCourses(): Promise<Course[]> {
  try {
    const res = await fetch(`${publicApi()}/courses`, { next: { revalidate: 30 } });
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
      <Breadcrumb title="All courses" crumb="Courses" />
      <div className="educate-details-course-area style-inner">
        <div className="container">
          <div className="row align-items-center section-title-space">
            <div className="col-lg-12">
              <div className="section_title text-center">
                <h1>Browse My all Course</h1>
              </div>
            </div>
          </div>
          <div className="row">
            {courses.map((course) => (
              <div className="col-xl-4 col-lg-6 col-md-6" key={course.id}>
                <CourseCard course={course} />
              </div>
            ))}
            {courses.length === 0 ? <p>No published courses yet.</p> : null}
          </div>
        </div>
      </div>
      <SiteFooter />
    </>
  );
}
