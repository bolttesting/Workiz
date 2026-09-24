import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Award,
  Building2,
  Check,
  Clock3,
  Play,
  Users,
} from "lucide-react";
import { courseDepartment } from "@workix/config";
import { Money } from "@/components/Money";
import type { Course, Lesson, ModuleRow } from "@workix/db/types";
import { SiteFooter, SiteHeader, Breadcrumb } from "@/components/SiteChrome";
import { CourseBuyActions } from "@/components/CourseBuyActions";
import { CourseReviewsQa } from "@/components/CourseReviewsQa";
import { publicApi } from "@/lib/session";

type InstructorRow = {
  user: { full_name: string | null } | null;
  profile: { slug: string } | null;
};

type DummyLesson = {
  id: string;
  title: string;
  type: string;
  duration: string;
  preview?: boolean;
};

type DummyModule = {
  id: string;
  title: string;
  lessons: DummyLesson[];
};

const DEMO_INSTRUCTOR = {
  name: "Sara Al-Mansouri",
  role: "Leadership Coach · Workiz Instructor",
  bio: "Former people-ops lead turned coach. Designs practical manager programs for UAE and GCC teams.",
  photo: "/assets/images/home-one/team-thumb1.png",
};

function formatDuration(minutes: number | null) {
  if (!minutes || minutes <= 0) return "Self-paced";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
}

function lessonDurationLabel(seconds: number | null) {
  if (!seconds || seconds <= 0) return "—";
  const mins = Math.max(1, Math.round(seconds / 60));
  return `${mins} min`;
}

async function load(slug: string) {
  try {
    const res = await fetch(`${publicApi()}/courses/${slug}`, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as {
      course: Course;
      modules: ModuleRow[];
      lessons: Lesson[];
      instructors?: InstructorRow[];
    };
  } catch {
    return null;
  }
}

function buildCurriculum(modules: ModuleRow[], lessons: Lesson[]): DummyModule[] {
  if (!modules.length) return [];
  return modules.map((mod) => ({
    id: mod.id,
    title: mod.title,
    lessons: lessons
      .filter((lesson) => lesson.module_id === mod.id)
      .map((lesson) => ({
        id: lesson.id,
        title: lesson.title,
        type: lesson.type,
        duration: lessonDurationLabel(lesson.duration_seconds),
        preview: lesson.is_preview,
      })),
  }));
}

export default async function CourseDetails({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await load(slug);

  if (!data?.course) notFound();

  const course = data.course;
  const curriculum = buildCurriculum(data.modules ?? [], data.lessons ?? []);
  const apiInstructors = data.instructors ?? [];
  const outcomes = (course.learning_outcomes ?? []).filter(Boolean);
  const audience = (course.audience ?? []).filter(Boolean);
  const tags = (course.tags ?? []).filter(Boolean);
  const thumb = course.thumbnail_url || "/assets/images/inner-img/course-thumb1.png";
  const coverVideo = course.cover_video_url || null;
  const blurb =
    course.description ||
    course.subtitle ||
    "Practical training your company can assign by role or department.";

  return (
    <>
      <SiteHeader />
      <Breadcrumb title={course.title} crumb="Course" />

      <section className="workiz-course-detail">
        <div className="container">
          <div className="row">
            <div className="col-lg-8">
              <div className="workiz-course-detail__main">
                <header className="workiz-course-detail__intro">
                  <p className="workiz-course-detail__eyebrow">COURSE DETAIL</p>
                  <h1 className="workiz-course-detail__title">{course.title}</h1>
                  {course.subtitle ? (
                    <p className="workiz-course-detail__lede">{course.subtitle}</p>
                  ) : null}

                  <div className="workiz-course-detail__meta">
                    <span className="workiz-course-detail__chip workiz-course-detail__chip--solid">
                      {courseDepartment(course)}
                    </span>
                    <span className="workiz-course-detail__chip">
                      <Clock3 size={14} strokeWidth={2.2} aria-hidden="true" />
                      {formatDuration(course.duration_minutes)}
                    </span>
                    <span className="workiz-course-detail__chip">
                      <Play size={14} strokeWidth={2.2} aria-hidden="true" />
                      On-demand
                    </span>
                    <span className="workiz-course-detail__chip">
                      <Users size={14} strokeWidth={2.2} aria-hidden="true" />
                      Team ready
                    </span>
                    {tags.map((tag) => (
                      <span className="workiz-course-detail__chip" key={tag}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </header>

                <div className="workiz-course-detail__hero-media">
                  {coverVideo ? (
                    <video
                      className="workiz-course-detail__hero-video"
                      src={coverVideo}
                      poster={course.thumbnail_url || undefined}
                      controls
                      playsInline
                      preload="metadata"
                    />
                  ) : (
                    <img src={thumb} alt="" />
                  )}
                  {!coverVideo ? <span className="workiz-course-detail__hero-scrim" aria-hidden="true" /> : null}
                </div>

                <section className="workiz-course-detail__block">
                  <h2>Overview</h2>
                  <p>{blurb}</p>
                  <p>
                    Learners complete recorded lessons, short practice prompts, and quizzes at their own pace.
                    Individuals can buy a course for personal learning; companies can contract seats and assign it by
                    department.
                  </p>
                </section>

                {outcomes.length ? (
                  <section className="workiz-course-detail__block">
                    <h2>What you&apos;ll learn</h2>
                    <ul className="workiz-course-detail__outcomes">
                      {outcomes.map((item) => (
                        <li key={item}>
                          <span className="workiz-course-detail__check" aria-hidden="true">
                            <Check size={14} strokeWidth={2.6} />
                          </span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}

                {audience.length ? (
                  <section className="workiz-course-detail__block">
                    <h2>Who it&apos;s for</h2>
                    <div className="workiz-course-detail__audience">
                      {audience.map((item) => (
                        <span key={item} className="workiz-course-detail__pill">
                          {item}
                        </span>
                      ))}
                    </div>
                  </section>
                ) : null}

                <section className="workiz-course-detail__block">
                  <div className="workiz-course-detail__curriculum-head">
                    <h2>Curriculum</h2>
                    <span>
                      {curriculum.length} modules ·{" "}
                      {curriculum.reduce((sum, mod) => sum + mod.lessons.length, 0)} lessons
                    </span>
                  </div>

                  <div className="workiz-course-detail__curriculum">
                    {curriculum.length ? (
                      curriculum.map((mod, index) => (
                      <details key={mod.id} className="workiz-course-detail__module" open={index === 0}>
                        <summary>
                          <span className="workiz-course-detail__module-title">{mod.title}</span>
                          <span className="workiz-course-detail__module-count">
                            {mod.lessons.length} lessons
                          </span>
                        </summary>
                        <ul>
                          {mod.lessons.map((lesson) => (
                            <li key={lesson.id}>
                              <span className="workiz-course-detail__lesson-icon" aria-hidden="true">
                                <Play size={12} strokeWidth={2.4} />
                              </span>
                              <div className="workiz-course-detail__lesson-copy">
                                <strong>{lesson.title}</strong>
                                <span>
                                  {lesson.type}
                                  {lesson.preview ? " · Preview" : ""}
                                </span>
                              </div>
                              <span className="workiz-course-detail__lesson-time">{lesson.duration}</span>
                            </li>
                          ))}
                        </ul>
                      </details>
                      ))
                    ) : (
                      <p className="mb-0">Curriculum is being prepared. Check back soon.</p>
                    )}
                  </div>
                </section>

                <section className="workiz-course-detail__block">
                  <h2>Instructor</h2>
                  {apiInstructors.length ? (
                    <ul className="workiz-course-detail__instructors">
                      {apiInstructors.map((person, i) => {
                        const name = person.user?.full_name || "Workiz Instructor";
                        const href = person.profile?.slug ? `/instructors/${person.profile.slug}` : null;
                        return (
                          <li key={`${name}-${i}`} className="workiz-course-detail__instructor">
                            <div className="workiz-course-detail__instructor-avatar" aria-hidden="true">
                              {name.charAt(0)}
                            </div>
                            <div>
                              <h3>
                                {href ? <Link href={href}>{name}</Link> : name}
                              </h3>
                              <p>Workiz Instructor</p>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <div className="workiz-course-detail__instructor">
                      <img src={DEMO_INSTRUCTOR.photo} alt="" />
                      <div>
                        <h3>{DEMO_INSTRUCTOR.name}</h3>
                        <p className="workiz-course-detail__instructor-role">{DEMO_INSTRUCTOR.role}</p>
                        <p>{DEMO_INSTRUCTOR.bio}</p>
                      </div>
                    </div>
                  )}
                </section>

                <CourseReviewsQa slug={course.slug} />
              </div>
            </div>

            <div className="col-lg-4">
              <aside className="workiz-course-detail__aside">
                <div className="workiz-course-detail__card">
                  <div className="workiz-course-detail__card-media">
                    <img src={thumb} alt="" />
                  </div>

                  <div className="workiz-course-detail__card-body">
                    <div className="workiz-course-detail__price-wrap">
                      <span className="workiz-course-detail__price-label">Course price</span>
                      <strong className="workiz-course-detail__price">
                        <Money cents={course.price_cents} currency={course.currency} />
                      </strong>
                    </div>

                    <p className="workiz-course-detail__card-note">
                      Buy for yourself, or ask your company to assign this course through a seat plan.
                    </p>

                    <CourseBuyActions course={course} />

                    <Link href="/pricing" className="workiz-course-detail__cta-secondary">
                      Contract seats for a team
                    </Link>

                    <ul className="workiz-course-detail__includes">
                      <li>
                        <Building2 size={15} strokeWidth={2.2} aria-hidden="true" />
                        Individual purchase or company seats
                      </li>
                      <li>
                        <Play size={15} strokeWidth={2.2} aria-hidden="true" />
                        Recorded lessons & practice
                      </li>
                      <li>
                        <Award size={15} strokeWidth={2.2} aria-hidden="true" />
                        Quiz + completion certificate
                      </li>
                      <li>
                        <Clock3 size={15} strokeWidth={2.2} aria-hidden="true" />
                        {formatDuration(course.duration_minutes)} total runtime
                      </li>
                    </ul>
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </>
  );
}
