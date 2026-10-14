import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Award, Building2, Check, Clock3, FileText, HelpCircle, Play, Users } from "lucide-react";
import { courseDepartment } from "@workix/config";
import { Money } from "@/components/Money";
import type { Course, Lesson, ModuleRow } from "@workix/db/types";
import { SiteFooter, SiteHeader, Breadcrumb } from "@/components/SiteChrome";
import { CourseBuyActions } from "@/components/CourseBuyActions";
import { CoursePreviewButton, type PreviewLesson } from "@/components/CoursePreview";
import { CourseReviewsQa } from "@/components/CourseReviewsQa";
import { CourseThumb } from "@/components/CourseThumb";
import { publicApi } from "@/lib/session";

const MAX_TAG_CHIPS = 2;

type InstructorRow = {
  user: { full_name: string | null; avatar_url?: string | null } | null;
  profile: { slug: string; headline?: string | null } | null;
};

type CurriculumLesson = {
  id: string;
  title: string;
  type: Lesson["type"];
  seconds: number;
  preview: PreviewLesson | null;
};

type CurriculumModule = {
  id: string;
  title: string;
  lessons: CurriculumLesson[];
};

type CourseData = {
  course: Course;
  modules: ModuleRow[];
  lessons: Lesson[];
  instructors?: InstructorRow[];
};

function formatDuration(minutes: number | null) {
  if (!minutes || minutes <= 0) return "Self-paced";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
}

function lessonDurationLabel(seconds: number) {
  if (!seconds || seconds <= 0) return null;
  return `${Math.max(1, Math.round(seconds / 60))} min`;
}

const LESSON_TYPE_LABEL: Record<Lesson["type"], string> = { video: "Video", article: "Reading", quiz: "Quiz" };

function LessonIcon({ type }: { type: Lesson["type"] }) {
  if (type === "article") return <FileText size={12} strokeWidth={2.4} />;
  if (type === "quiz") return <HelpCircle size={12} strokeWidth={2.4} />;
  return <Play size={12} strokeWidth={2.4} />;
}

const load = async (slug: string): Promise<CourseData | null> => {
  try {
    const res = await fetch(`${publicApi()}/courses/${slug}`, { next: { revalidate: 60 } });
    if (!res.ok) return null;
    return (await res.json()) as CourseData;
  } catch {
    return null;
  }
};

function toPreview(lesson: Lesson): PreviewLesson | null {
  if (!lesson.is_preview) return null;
  if (lesson.type === "video") return { id: lesson.id, title: lesson.title, type: "video" };
  if (lesson.type === "article" && lesson.article_content) {
    return { id: lesson.id, title: lesson.title, type: "article", articleHtml: lesson.article_content };
  }
  return null;
}

function buildCurriculum(modules: ModuleRow[], lessons: Lesson[]): CurriculumModule[] {
  return modules.map((mod) => ({
    id: mod.id,
    title: mod.title,
    lessons: lessons
      .filter((lesson) => lesson.module_id === mod.id)
      .map((lesson) => ({
        id: lesson.id,
        title: lesson.title,
        type: lesson.type,
        seconds: lesson.duration_seconds ?? 0,
        preview: toPreview(lesson),
      })),
  }));
}

function plainText(value: string, max = 160) {
  const text = value.replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const data = await load(slug);
  if (!data?.course) return { title: "Course not found" };
  const { course } = data;
  const description = plainText(course.subtitle || course.description || `${course.title} — online training by WORKIZ.`);
  const image = course.thumbnail_url && /^https?:\/\//.test(course.thumbnail_url) ? course.thumbnail_url : undefined;
  return {
    title: course.title,
    description,
    alternates: { canonical: `/courses/${course.slug}` },
    openGraph: {
      title: course.title,
      description,
      url: `/courses/${course.slug}`,
      images: image ? [{ url: image }] : undefined,
    },
  };
}

export default async function CourseDetails({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await load(slug);

  if (!data?.course) notFound();

  const course = data.course;
  const curriculum = buildCurriculum(data.modules ?? [], data.lessons ?? []);
  const allLessons = curriculum.flatMap((mod) => mod.lessons);
  const lessonSeconds = allLessons.reduce((sum, lesson) => sum + lesson.seconds, 0);
  const totalMinutes = course.duration_minutes || (lessonSeconds > 0 ? Math.round(lessonSeconds / 60) : null);
  const previews = allLessons.map((lesson) => lesson.preview).filter((p): p is PreviewLesson => Boolean(p));
  const heroPreview = previews.find((p) => p.type === "video") ?? previews[0] ?? null;
  const instructors = data.instructors ?? [];
  const outcomes = (course.learning_outcomes ?? []).filter(Boolean);
  const audience = (course.audience ?? []).filter(Boolean);
  const tags = (course.tags ?? []).filter(Boolean);
  const coverVideo = course.cover_video_url || null;
  const blurb =
    course.description ||
    course.subtitle ||
    "Practical training your company can assign by role or department.";

  const webBase = process.env.NEXT_PUBLIC_WEB_URL || "http://localhost:3000";
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: course.title,
    description: plainText(blurb, 300),
    url: `${webBase}/courses/${course.slug}`,
    ...(course.thumbnail_url && /^https?:\/\//.test(course.thumbnail_url) ? { image: course.thumbnail_url } : {}),
    provider: { "@type": "Organization", name: "WORKIZ", sameAs: webBase },
    offers: {
      "@type": "Offer",
      category: "Paid",
      price: (course.price_cents / 100).toFixed(2),
      priceCurrency: (course.currency || "aed").toUpperCase(),
      availability: "https://schema.org/InStock",
    },
    hasCourseInstance: {
      "@type": "CourseInstance",
      courseMode: "Online",
      ...(totalMinutes ? { courseWorkload: `PT${totalMinutes}M` } : {}),
    },
    ...(instructors.length
      ? {
          instructor: instructors
            .filter((person) => person.user?.full_name)
            .map((person) => ({ "@type": "Person", name: person.user?.full_name })),
        }
      : {}),
  };

  return (
    <>
      <SiteHeader />
      <Breadcrumb title="Courses" crumb={course.title} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />

      <section className="workiz-course-detail">
        <div className="container">
          <div className="row">
            <div className="col-lg-8">
              <div className="workiz-course-detail__main">
                <header className="workiz-course-detail__intro">
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
                      {formatDuration(totalMinutes)}
                    </span>
                    <span className="workiz-course-detail__chip">
                      <Play size={14} strokeWidth={2.2} aria-hidden="true" />
                      {allLessons.length} {allLessons.length === 1 ? "lesson" : "lessons"}
                    </span>
                    <span className="workiz-course-detail__chip">
                      <Users size={14} strokeWidth={2.2} aria-hidden="true" />
                      Team ready
                    </span>
                    {tags.slice(0, MAX_TAG_CHIPS).map((tag) => (
                      <span className="workiz-course-detail__chip" key={tag}>
                        {tag}
                      </span>
                    ))}
                    {tags.length > MAX_TAG_CHIPS ? (
                      <span
                        className="workiz-course-detail__chip"
                        title={tags.slice(MAX_TAG_CHIPS).join(", ")}
                        aria-label={`Also tagged: ${tags.slice(MAX_TAG_CHIPS).join(", ")}`}
                      >
                        +{tags.length - MAX_TAG_CHIPS}
                      </span>
                    ) : null}
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
                    <>
                      <CourseThumb src={course.thumbnail_url} />
                      <span className="workiz-course-detail__hero-scrim" aria-hidden="true" />
                      {heroPreview ? (
                        <div className="workiz-course-detail__hero-action">
                          <CoursePreviewButton slug={course.slug} lesson={heroPreview} variant="hero" />
                        </div>
                      ) : null}
                    </>
                  )}
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

                <section className="workiz-course-detail__block" id="curriculum">
                  <div className="workiz-course-detail__curriculum-head">
                    <h2>Curriculum</h2>
                    <span>
                      {curriculum.length} {curriculum.length === 1 ? "module" : "modules"} · {allLessons.length}{" "}
                      {allLessons.length === 1 ? "lesson" : "lessons"}
                      {lessonSeconds > 0 ? ` · ${formatDuration(Math.round(lessonSeconds / 60))}` : ""}
                      {previews.length ? ` · ${previews.length} free ${previews.length === 1 ? "preview" : "previews"}` : ""}
                    </span>
                  </div>

                  <div className="workiz-course-detail__curriculum">
                    {curriculum.length ? (
                      curriculum.map((mod, index) => (
                        <details key={mod.id} className="workiz-course-detail__module" open={index === 0}>
                          <summary>
                            <span className="workiz-course-detail__module-title">{mod.title}</span>
                            <span className="workiz-course-detail__module-count">
                              {mod.lessons.length} {mod.lessons.length === 1 ? "lesson" : "lessons"}
                            </span>
                          </summary>
                          <ul>
                            {mod.lessons.map((lesson) => (
                              <li key={lesson.id}>
                                <span className="workiz-course-detail__lesson-icon" aria-hidden="true">
                                  <LessonIcon type={lesson.type} />
                                </span>
                                <div className="workiz-course-detail__lesson-copy">
                                  <strong>{lesson.title}</strong>
                                  <span>{LESSON_TYPE_LABEL[lesson.type]}</span>
                                </div>
                                {lesson.preview ? (
                                  <CoursePreviewButton slug={course.slug} lesson={lesson.preview} label="Preview" />
                                ) : null}
                                <span className="workiz-course-detail__lesson-time">
                                  {lessonDurationLabel(lesson.seconds) ?? ""}
                                </span>
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

                {instructors.length ? (
                  <section className="workiz-course-detail__block">
                    <h2>{instructors.length === 1 ? "Instructor" : "Instructors"}</h2>
                    <ul className="workiz-course-detail__instructors">
                      {instructors.map((person, i) => {
                        const name = person.user?.full_name || "WORKIZ instructor";
                        const href = person.profile?.slug ? `/instructors/${person.profile.slug}` : null;
                        const avatar = person.user?.avatar_url;
                        return (
                          <li key={`${name}-${i}`} className="workiz-course-detail__instructor">
                            {avatar ? (
                              <img className="workiz-course-detail__instructor-photo" src={avatar} alt="" />
                            ) : (
                              <div className="workiz-course-detail__instructor-avatar" aria-hidden="true">
                                {name.charAt(0)}
                              </div>
                            )}
                            <div>
                              <h3>{href ? <Link href={href}>{name}</Link> : name}</h3>
                              <p>{person.profile?.headline || "WORKIZ instructor"}</p>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                ) : null}

                <CourseReviewsQa slug={course.slug} />
              </div>
            </div>

            <div className="col-lg-4">
              <aside className="workiz-course-detail__aside" id="buy">
                <div className="workiz-course-detail__card">
                  <div className="workiz-course-detail__card-media">
                    <CourseThumb src={course.thumbnail_url} />
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

                    {heroPreview ? (
                      <div className="workiz-course-detail__card-preview">
                        <CoursePreviewButton slug={course.slug} lesson={heroPreview} />
                      </div>
                    ) : null}

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
                        Recorded lessons &amp; practice
                      </li>
                      <li>
                        <Award size={15} strokeWidth={2.2} aria-hidden="true" />
                        Completion certificate
                      </li>
                      <li>
                        <Clock3 size={15} strokeWidth={2.2} aria-hidden="true" />
                        {formatDuration(totalMinutes)} total runtime
                      </li>
                    </ul>
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </div>
      </section>

      <div className="workiz-course-buybar" role="region" aria-label="Buy this course">
        <div className="workiz-course-buybar__price">
          <span>{course.title}</span>
          <strong>
            <Money cents={course.price_cents} currency={course.currency} />
          </strong>
        </div>
        <a href="#buy" className="workiz-course-buybar__cta">
          Buy course
        </a>
      </div>

      <SiteFooter />
    </>
  );
}
