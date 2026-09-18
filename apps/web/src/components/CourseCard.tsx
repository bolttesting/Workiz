import Link from "next/link";
import { formatMoney } from "@workix/config";
import type { Course } from "@workix/db/types";

function resolveThumb(url: string | null, fallback: string) {
  if (!url) return fallback;
  return url;
}

function Stars() {
  return (
    <ul>
      <li>
        <i className="fa-solid fa-star" />
      </li>
      <li>
        <i className="fa-solid fa-star" />
      </li>
      <li>
        <i className="fa-solid fa-star" />
      </li>
      <li>
        <i className="fa-solid fa-star" />
      </li>
      <li>
        <i className="fa-classic fa-solid fa-star-half-stroke fa-fw" />
      </li>
    </ul>
  );
}

export function CourseCard({ course }: { course: Course }) {
  const thumb = resolveThumb(course.thumbnail_url, "/assets/images/inner-img/course-thumb1.png");
  return (
    <div className="course-details-box">
      <div className="course-details-thumb">
        <img src={thumb} alt="" />
        <div className="course-meta-top">
          <span>{course.level || "Course"}</span>
        </div>
      </div>
      <div className="course-details-content">
        <h4>
          <Link href={`/courses/${course.slug}`}>{course.title}</Link>
        </h4>
        <div className="course-rating">
          <Stars />
          <div className="course-rating-num">
            <span>(4.5 Ratings)</span>
          </div>
          <div className="course-price">
            <h3>{formatMoney(course.price_cents, course.currency)}</h3>
          </div>
        </div>
        <div className="course-details-list">
          <div className="course-lesson">
            <span>
              <i className="fa-regular fa-file-lines" /> {course.duration_minutes ?? 0} min
            </span>
          </div>
          <div className="course-student">
            <span>
              <i className="fa-regular fa-user" /> Recorded
            </span>
          </div>
        </div>
        <div className="course-btn">
          <Link href={`/courses/${course.slug}`}>
            Enroll Now <i className="flaticon flaticon-right-arrow" />
          </Link>
        </div>
      </div>
    </div>
  );
}

export function HomeCourseCard({ course, index }: { course: Course; index: number }) {
  const box = index % 3 === 0 ? "" : index % 3 === 1 ? " box-2" : " box-3";
  const thumb = resolveThumb(course.thumbnail_url, `/assets/images/home-one/case-thumb${(index % 3) + 1}.jpg`);
  const autor = `/assets/images/home-one/case-autor${index % 3 === 0 ? "" : index % 3 === 1 ? "2" : "3"}.png`;
  return (
    <div className="col-xl-4 col-lg-6 col-md-6 grid-item">
      <div className={`case-study-single-box${box}`}>
        <div className="case-study-thumb">
          <img src={thumb} alt="" />
          <div className="case-meta-top">
            <span>{formatMoney(course.price_cents, course.currency)}</span>
          </div>
        </div>
        <div className="case-study-content">
          <h5>{course.level || "Course"}</h5>
          <h4>
            <Link href={`/courses/${course.slug}`}>{course.title}</Link>
          </h4>
          <div className="case-rating">
            <Stars />
            <div className="case-rating-num">
              <span>(4.5 Ratings)</span>
            </div>
          </div>
          <div className="case-autor-box">
            <div className="case-autor-img">
              <img src={autor} alt="" />
            </div>
            <div className="case-autor-content">
              <h3>Workiz Instructor</h3>
              <p>Instructor</p>
            </div>
          </div>
          <div className="case-course-content">
            <div className="course-lesson">
              <span>
                <i className="fa-regular fa-file-lines" /> {course.duration_minutes ?? 0} min
              </span>
            </div>
            <div className="course-student">
              <span>
                <i className="fa-regular fa-user" /> Catalog
              </span>
            </div>
          </div>
          <div className="course-btn">
            <Link href={`/courses/${course.slug}`}>
              Enroll Now <i className="flaticon flaticon-right-arrow" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
