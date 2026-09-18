import { notFound } from "next/navigation";
import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { publicApi } from "@/lib/session";
import type { Course, Lesson, ModuleRow } from "@workix/db/types";

async function load(slug: string) {
  try {
    const res = await fetch(`${publicApi()}/courses/${slug}`, { next: { revalidate: 15 } });
    if (!res.ok) return null;
    return (await res.json()) as {
      course: Course;
      modules: ModuleRow[];
      lessons: Lesson[];
      instructors?: { user: { full_name: string | null } | null; profile: { slug: string } | null }[];
    };
  } catch {
    return null;
  }
}

export default async function CourseDetails({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await load(slug);
  if (!data) notFound();
  const { course, modules, lessons, instructors = [] } = data;
  return (
    <>
      <SiteHeader />
      <div className="breadcumb-area workiz-breadcrumb d-flex">
        <div className="container">
          <div className="row align-items-center">
            <div className="col-lg-12">
              <div className="breadcumb-content text-center">
                <div className="breadcumb-title">
                  <h4>{course.title}</h4>
                </div>
                <ul>
                  <li>
                    <Link href="/">
                      Home{" "}
                      <span>
                        <i className="fa-solid fa-arrow-right-long" />
                      </span>
                    </Link>
                  </li>
                  <li>Course</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
      <section className="course-details-area style-inner">
        <div className="container">
          <div className="row">
            <div className="col-lg-8">
              <div className="course-details-content">
                <h2 className="course-details-title">Course overview</h2>
                <p className="description">{course.description || course.subtitle}</p>
                {instructors.length ? (
                  <>
                    <h3 className="course-details-content-title">Instructors</h3>
                    <ul>
                      {instructors.map((person, i) => (
                        <li key={i}>
                          {person.profile?.slug ? (
                            <a href={`/instructors/${person.profile.slug}`}>{person.user?.full_name}</a>
                          ) : (
                            person.user?.full_name
                          )}
                        </li>
                      ))}
                    </ul>
                  </>
                ) : null}
                <h3 className="course-details-content-title">Curriculum</h3>
                {modules.map((mod) => (
                  <div key={mod.id} className="mb-4">
                    <h5>{mod.title}</h5>
                    <ul>
                      {lessons
                        .filter((l) => l.module_id === mod.id)
                        .map((lesson) => (
                          <li key={lesson.id}>
                            {lesson.title} — {lesson.type}
                            {lesson.is_preview ? " (preview)" : ""}
                          </li>
                        ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
            <div className="col-lg-4">
              <div className="course-details-box">
                <div className="course-details-thumb">
                  <img src={course.thumbnail_url || "/assets/images/inner-img/course-thumb1.png"} alt="" />
                </div>
                <div className="course-details-content">
                  <div className="course-price">
                    <h3>Company assigned</h3>
                  </div>
                  <p>
                    Courses are assigned by your company admin after seats are contracted. Learners do not purchase
                    courses individually.
                  </p>
                  <div className="course-btn">
                    <Link href="/pricing" className="btn btn_primary">
                      Contract seats
                    </Link>
                  </div>
                  <p className="mt-3 mb-0">
                    <Link href="/contact">Talk to us about onboarding</Link>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      <SiteFooter />
    </>
  );
}
