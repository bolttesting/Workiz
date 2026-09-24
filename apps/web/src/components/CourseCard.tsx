import Link from "next/link";
import { ArrowUpRight, Clock3, Play } from "lucide-react";
import { courseDepartment } from "@workix/config";
import type { Course } from "@workix/db/types";
import { Money } from "@/components/Money";

function resolveThumb(url: string | null, fallback: string) {
  if (!url) return fallback;
  return url;
}

function formatDuration(minutes: number | null) {
  if (!minutes || minutes <= 0) return "Self-paced";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
}

export function CourseCard({ course }: { course: Course }) {
  const thumb = resolveThumb(course.thumbnail_url, "/assets/images/inner-img/course-thumb1.png");
  const blurb = course.subtitle || course.description || "Practical training for professional teams.";
  const duration = formatDuration(course.duration_minutes);
  const department = courseDepartment(course);

  return (
    <article className="workiz-course-card">
      <Link href={`/courses/${course.slug}`} className="workiz-course-card__media">
        <img src={thumb} alt="" />
        <span className="workiz-course-card__scrim" aria-hidden="true" />
        <span className="workiz-course-card__dept">{department}</span>
        <span className="workiz-course-card__duration">
          <Clock3 size={13} strokeWidth={2.2} aria-hidden="true" />
          {duration}
        </span>
      </Link>

      <div className="workiz-course-card__body">
        <div className="workiz-course-card__copy">
          <h3 className="workiz-course-card__title">
            <Link href={`/courses/${course.slug}`}>{course.title}</Link>
          </h3>
          <p className="workiz-course-card__blurb">{blurb}</p>
        </div>

        <div className="workiz-course-card__meta">
          <span className="workiz-course-card__chip workiz-course-card__chip--dept">
            {department}
          </span>
          <span className="workiz-course-card__chip">
            <Play size={12} strokeWidth={2.4} aria-hidden="true" />
            On-demand
          </span>
        </div>

        <div className="workiz-course-card__footer">
          <div className="workiz-course-card__price-wrap">
            <span className="workiz-course-card__price-label">Price</span>
            <strong className="workiz-course-card__price">
              <Money cents={course.price_cents} currency={course.currency} />
            </strong>
          </div>
          <Link href={`/courses/${course.slug}`} className="workiz-course-card__cta">
            View
            <ArrowUpRight size={16} strokeWidth={2.4} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </article>
  );
}
