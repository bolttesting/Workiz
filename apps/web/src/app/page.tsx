import { Suspense } from "react";
import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { HomeCoursesCarousel } from "@/components/HomeCoursesCarousel";
import { HomePageScripts } from "@/components/HomePageScripts";
import { BlogCard } from "@/components/BlogCard";
import { fetchBlogPosts } from "@/lib/blog";
import { publicApi } from "@/lib/session";
import type { Course } from "@workix/db/types";

type HomeInstructor = { slug: string; name: string; headline: string; photo: string };

async function loadHome() {
  try {
    const [coursesRes, instructorsRes, posts] = await Promise.all([
      fetch(`${publicApi()}/courses`, { next: { revalidate: 30 } }),
      fetch(`${publicApi()}/instructors`, { next: { revalidate: 30 } }),
      fetchBlogPosts(),
    ]);
    const coursesJson = coursesRes.ok ? await coursesRes.json() : { courses: [] };
    const instructorsJson = instructorsRes.ok ? await instructorsRes.json() : { instructors: [] };
    const courses: Course[] = coursesJson.courses?.length ? coursesJson.courses.slice(0, 9) : [];
    const instructors: HomeInstructor[] =
      instructorsJson.instructors?.length > 0
        ? instructorsJson.instructors.slice(0, 4).map(
            (
              person: { slug: string; headline?: string; user?: { full_name?: string; avatar_url?: string } },
            ): HomeInstructor => ({
              slug: person.slug,
              name: person.user?.full_name || "Instructor",
              headline: person.headline || "Workiz instructor",
              photo: person.user?.avatar_url || "/assets/images/home-one/team-thumb1.png",
            }),
          )
        : [];
    return { courses, instructors, posts: posts.slice(0, 3) };
  } catch {
    const posts = await fetchBlogPosts();
    return { courses: [] as Course[], instructors: [] as HomeInstructor[], posts: posts.slice(0, 3) };
  }
}

export default function HomePage() {
  return (
    <>
      <HomePageScripts />
      <SiteHeader />

      <section className="hero_area style-one d-flex align-items-center">
        <div className="container">
          <div className="row align-items-center">
            <div className="col-lg-6">
              <div className="hero_content">
                <h5>
                  <i className="bi bi-check2" /> ONLINE LEARNING PLATFORM
                </h5>
                <h1>Professional Training</h1>
                <h1>for Modern Teams</h1>
                <p>
                  Give your team access to practical online training that builds useful skills, strengthens workplace
                  performance, and supports continuous development.
                </p>
                <div className="hero-button">
                  <div className="hero-btn">
                    <Link href="/courses">
                      Explore Courses <i className="flaticon flaticon-right-arrow" />
                    </Link>
                  </div>
                  <div className="hero-course-btn">
                    <Link href="/pricing">
                      For Companies <i className="flaticon flaticon-right-arrow" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-lg-6">
              <div className="hero-thumb-wrapper workiz-hero-media">
                <div className="hero-thumb">
                  <img
                    src="/assets/images/home-one/hero-workiz.png"
                    alt="Workiz professional training"
                    width={525}
                    height={640}
                    fetchPriority="high"
                    decoding="async"
                  />
                </div>
                <div className="hero-shape1 rotateme">
                  <img src="/assets/images/home-one/hero-shape1.png" alt="" />
                </div>
                <div className="hero-arrow-shape">
                  <img src="/assets/images/home-one/hero-arrow.png" alt="" />
                </div>
                <div className="hero-dot-shape">
                  <img src="/assets/images/home-one/hero-dot.png" alt="" />
                </div>
                <div className="hero-shape3 bounce-animate-3">
                  <img src="/assets/images/home-one/hero-shape3.png" alt="" />
                </div>
                <div className="hero-autor-box">
                  <div className="autor-thumb">
                    <img src="/assets/images/home-one/hero-autor.png" alt="" />
                  </div>
                  <div className="hero-autor-content">
                    <h3 className="counter">1200</h3>
                    <span>+</span>
                    <p>Learners</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="feature-area style-one">
        <div className="container">
          <div className="row align-items-center section-title-space" data-reveal>
            <div className="col-lg-8">
              <div className="section_title">
                <h2 className="workiz-home-title">Learn online, at your pace</h2>
                <p className="workiz-section-lede">
                  Learn through practical content, flexible access, and a structured training experience built around
                  your goals.
                </p>
              </div>
            </div>
          </div>
          <div className="row" data-reveal-stagger>
            <div className="col-xl-4 col-lg-6 col-md-6 col-sm-6" data-reveal>
              <div className="single-feature-box box-1">
                <div className="feature-icon">
                  <img src="/assets/images/home-one/feature-icon1.png" alt="" />
                </div>
                <div className="feature-content">
                  <h4 className="feature-title">Learn at Your Own Pace</h4>
                  <p className="feature-desc">
                    Access course materials online and learn at a pace that fits your schedule.
                  </p>
                </div>
                <div className="educate-hover-box hover-bx" />
                <div className="educate-hover-box hover-bx2" />
                <div className="educate-hover-box hover-bx3" />
                <div className="educate-hover-box hover-bx4" />
              </div>
            </div>
            <div className="col-xl-4 col-lg-6 col-md-6 col-sm-6" data-reveal>
              <div className="single-feature-box box-2">
                <div className="feature-icon">
                  <img src="/assets/images/home-one/feature-icon2.png" alt="" />
                </div>
                <div className="feature-content">
                  <h4 className="feature-title">Practical Skills for Real Work</h4>
                  <p className="feature-desc">
                    Build useful knowledge through training designed around workplace needs and everyday challenges.
                  </p>
                </div>
                <div className="educate-hover-box hover-bx" />
                <div className="educate-hover-box hover-bx2" />
                <div className="educate-hover-box hover-bx3" />
                <div className="educate-hover-box hover-bx4" />
              </div>
            </div>
            <div className="col-xl-4 col-lg-6 col-md-6 col-sm-6" data-reveal>
              <div className="single-feature-box box-3">
                <div className="feature-icon">
                  <img src="/assets/images/home-one/feature-icon3.png" alt="" />
                </div>
                <div className="feature-content">
                  <h4 className="feature-title">Training That Supports Growth</h4>
                  <p className="feature-desc">
                    Explore learning opportunities that help you strengthen existing skills and develop new ones.
                  </p>
                </div>
                <div className="educate-hover-box hover-bx" />
                <div className="educate-hover-box hover-bx2" />
                <div className="educate-hover-box hover-bx3" />
                <div className="educate-hover-box hover-bx4" />
              </div>
            </div>
          </div>
          <div className="feature-shape1">
            <img src="/assets/images/home-one/feature-shape1.png" alt="" />
          </div>
          <div className="feature-shape2 rotateme">
            <img src="/assets/images/home-one/feature-shape2.png" alt="" />
          </div>
        </div>
      </section>

      <section className="about-area style-one">
        <div className="container">
          <div className="row">
            <div className="col-xl-6 col-lg-12" data-reveal>
              <div className="about-thumb-wrapper workiz-about-home-media">
                <div className="about-thumb">
                  <img
                    src="/assets/images/home-one/about-workiz.png"
                    alt="Workiz learners"
                    width={640}
                    height={480}
                    loading="lazy"
                    decoding="async"
                  />
                </div>
              </div>
            </div>
            <div className="col-xl-6 col-lg-12" data-reveal style={{ ["--reveal-delay" as string]: "100ms" }}>
              <div className="about_content workiz-about-home-copy">
                <div className="section_title">
                  <h2 className="workiz-home-title">Training from Dubai</h2>
                </div>
                <div className="section-title-desc">
                  <p>
                    Workiz is a Dubai-based training and development company focused on making practical learning
                    accessible to individuals and professionals.
                  </p>
                  <p>
                    Our programs cover professional skills, language learning, financial awareness, cultural
                    understanding, and personal development. We aim to help learners gain useful knowledge and prepare
                    for the challenges of work and everyday life.
                  </p>
                  <p>
                    Whether you want to strengthen your skills, prepare for a new opportunity, or continue learning,
                    Workiz brings relevant training into one accessible online platform.
                  </p>
                </div>
                <div className="row">
                  <div className="col-lg-6">
                    <div className="about-item-list">
                      <span>
                        <img src="/assets/images/home-one/about-icon.png" alt="" /> Professional Skills Training
                      </span>
                    </div>
                  </div>
                  <div className="col-lg-6">
                    <div className="about-item-list">
                      <span>
                        <img src="/assets/images/home-one/about-icon.png" alt="" /> Cultural &amp; Specialized Programs
                      </span>
                    </div>
                  </div>
                </div>
                <div className="about-btn">
                  <Link href="/about">
                    Read More <i className="flaticon flaticon-right-arrow" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
          <div className="about-shape5">
            <img src="/assets/images/home-one/about-shape5.png" alt="" />
          </div>
        </div>
      </section>
      <Suspense fallback={<HomePending />}>
        <HomeBelow />
      </Suspense>
    </>
  );
}

function HomePending() {
  return (
    <div className="workiz-home-pending" aria-hidden="true">
      <span />
      <span />
      <span />
    </div>
  );
}

async function HomeBelow() {
  const { courses, instructors, posts } = await loadHome();
  return (
    <>
      <div className="case-study-area style-one">
        <div className="container">
          <div className="row align-items-center section-title-space" data-reveal>
            <div className="col-lg-8">
              <div className="section_title">
                <h2 className="workiz-home-title">Courses</h2>
                <p className="workiz-section-lede">
                  Explore courses designed to build practical skills, improve professional knowledge, and support
                  continuous learning.
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="container">
          <HomeCoursesCarousel courses={courses} />
          <div className="text-center mt-4 mb-2">
            <Link href="/courses" className="btn btn_primary">
              View All Courses <i className="flaticon flaticon-right-arrow" />
            </Link>
          </div>
        </div>
      </div>

      <div className="why-choose-area style-one">
        <div className="container">
          <div className="row align-items-center">
            <div className="col-lg-7" data-reveal>
              <div className="choose-content">
                <div className="section_title">
                  <h2 className="workiz-home-title">Why Workiz</h2>
                </div>
                <div className="section-title-desc">
                  <p>
                    Training should lead to something useful. Understand new ideas, practise your skills, and put your
                    learning into action.
                  </p>
                  <p>
                    At Workiz, we focus on practical online learning that supports professional development, workplace
                    effectiveness, and everyday confidence.
                  </p>
                </div>
                <div className="choose-item-menu">
                  <ul>
                    <li>
                      <img src="/assets/images/home-one/choose-icon1.png" alt="" /> Practical Learning Experience
                    </li>
                    <li>
                      <img src="/assets/images/home-one/choose-icon2.png" alt="" /> Professional Skills Development
                    </li>
                    <li>
                      <img src="/assets/images/home-one/choose-icon3.png" alt="" /> Flexible Online Access
                    </li>
                    <li>
                      <img src="/assets/images/home-one/choose-icon4.png" alt="" /> Learning for Different Goals
                    </li>
                  </ul>
                </div>
                <div className="choose-btn">
                  <Link href="/courses">
                    Explore Learning <i className="flaticon flaticon-right-arrow" />
                  </Link>
                </div>
              </div>
            </div>
            <div className="col-lg-5" data-reveal style={{ ["--reveal-delay" as string]: "120ms" }}>
              <div className="choose-thumb workiz-choose-media">
                <img
                  src="/assets/images/home-one/why-choose-workiz.png"
                  alt="Why choose Workiz"
                  width={585}
                  height={543}
                  loading="lazy"
                  decoding="async"
                />
                <div className="choose-shape-dot">
                  <img src="/assets/images/home-one/choose-dot.png" alt="" />
                </div>
                <div className="choose-shape-star">
                  <img src="/assets/images/home-one/choose-star.png" alt="" />
                </div>
              </div>
            </div>
          </div>
          <div className="choose-shape1">
            <img src="/assets/images/home-one/choose-shape1.png" alt="" />
          </div>
          <div className="choose-shape2">
            <img src="/assets/images/home-one/choose-circle.png" alt="" />
          </div>
        </div>
      </div>

      <div className="course-design-offer-area style-one" data-reveal>
        <div className="container">
          <div className="row">
            <div className="col-lg-6">
              <div className="course-design-thumb">
                <img src="/assets/images/home-one/offer-video.png" alt="" width={648} height={400} loading="lazy" decoding="async" />
                <div className="course-video-icon">
                  <a
                    className="video-vemo-icon venobox vbox-item"
                    data-vbtype="youtube"
                    data-autoplay="true"
                    href="https://www.youtube.com/watch?v=Wx48y_fOfiY"
                  >
                    <i className="fa-classic fa-solid fa-play fa-fw" />
                  </a>
                </div>
              </div>
            </div>
            <div className="col-lg-6">
              <div className="single-course-offer-box">
                <div className="course-offer-content">
                  <h2 className="workiz-home-title">Company training</h2>
                  <p className="workiz-offer-lede">
                    Build essential workplace skills through training in communication, teamwork, professional
                    behaviour, and effective collaboration.
                  </p>
                  <div className="course-offer-btn">
                    <Link href="/courses">
                      Explore Courses <i className="flaticon flaticon-right-arrow" />
                    </Link>
                  </div>
                </div>
                <div className="offer-thumb workiz-offer-thumb">
                  <img
                    src="/assets/images/home-one/company-training-workiz.png"
                    alt="Company training"
                    width={327}
                    height={450}
                    loading="lazy"
                    decoding="async"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {instructors.length > 0 ? (
      <div className="team-area style-one">
        <div className="container">
          <div className="row section-title-space" data-reveal>
            <div className="col-lg-8">
              <div className="section_title">
                <h2 className="workiz-home-title">Instructors</h2>
                <p className="workiz-section-lede">
                  Meet the people behind our learning experience. Workiz brings together instructors who help learners
                  develop knowledge and practical skills through focused training.
                </p>
              </div>
            </div>
          </div>
          <div className="row" data-reveal-stagger>
            {instructors.map((person, i) => (
              <div className="col-xl-3 col-lg-6 col-md-6" key={person.slug} data-reveal>
                <div className={`single-team-box box-${(i % 4) + 1}`}>
                  <div className="team-thumb">
                    <img src={person.photo} alt="" />
                    <div className="team-social-icon">
                      <div className="team-social">
                        <ul>
                          <li className="team-icon-1">
                            <a href={`/instructors/${person.slug}`}>
                              <i className="fab fa-facebook-f" />
                            </a>
                          </li>
                          <li className="team-icon-2">
                            <a href={`/instructors/${person.slug}`}>
                              <i className="fa-brands fa-x-twitter" />
                            </a>
                          </li>
                          <li className="team-icon-3">
                            <a href={`/instructors/${person.slug}`}>
                              <i className="fab fa-linkedin-in" />
                            </a>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                  <div className="team-content">
                    <div className="team-title">
                      <h3>
                        <Link href={`/instructors/${person.slug}`}>{person.name}</Link>
                      </h3>
                    </div>
                    <div className="team-sub-title">
                      <h5>{person.headline}</h5>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="text-center mt-4" data-reveal>
            <Link href="/instructors" className="btn btn_primary">
              View All Instructors <i className="flaticon flaticon-right-arrow" />
            </Link>
          </div>
          <div className="team-shape1">
            <img src="/assets/images/home-one/team-shape1.png" alt="" />
          </div>
        </div>
      </div>
      ) : null}

      <section className="workiz-testimonials">
        <div className="container">
          <header className="workiz-testimonials__head" data-reveal>
            <h2 className="workiz-testimonials__title">What learners say</h2>
            <p className="workiz-testimonials__lede">
              Learning is personal. We value feedback from people who take our courses and use what they learn in their
              professional and everyday lives.
            </p>
          </header>

          <div className="workiz-testimonials__layout">
            <div className="workiz-testimonials__media" data-reveal>
              <img src="/assets/images/home-one/testimonial-workiz.png" alt="Workiz learner testimonials" />
              <div className="testi-dot-shape">
                <img src="/assets/images/home-one/testi-dot.png" alt="" />
              </div>
              <div className="testi-map-shape">
                <img src="/assets/images/home-one/testi-map.png" alt="" />
              </div>
            </div>

            <div className="workiz-testimonials__quotes" data-reveal style={{ ["--reveal-delay" as string]: "100ms" }}>
              <article className="workiz-quote-card workiz-quote-card--featured">
                <div className="workiz-quote-card__mark" aria-hidden="true">
                  “
                </div>
                <h3>Practical and Useful</h3>
                <p>
                  The courses were clear, flexible, and easy to apply at work. I gained confidence in communication and
                  cultural awareness that I use every day.
                </p>
                <div className="workiz-quote-card__meta">
                  <div className="workiz-quote-card__stars" aria-label="4.5 out of 5 stars">
                    <i className="fa-solid fa-star" />
                    <i className="fa-solid fa-star" />
                    <i className="fa-solid fa-star" />
                    <i className="fa-solid fa-star" />
                    <i className="fa-classic fa-solid fa-star-half-stroke fa-fw" />
                  </div>
                  <div>
                    <strong>Sonia Sara</strong>
                    <span>Learner</span>
                  </div>
                </div>
              </article>

              <div className="workiz-testimonials__grid">
                <article className="workiz-quote-card">
                  <p>
                    Flexible online access made it easy to learn around my schedule while still building skills I could
                    use at work right away.
                  </p>
                  <div className="workiz-quote-card__meta">
                    <strong>Amira K.</strong>
                    <span>Professional Skills</span>
                  </div>
                </article>
                <article className="workiz-quote-card">
                  <p>
                    The cultural awareness training helped our team communicate with more confidence across different
                    workplaces.
                  </p>
                  <div className="workiz-quote-card__meta">
                    <strong>James R.</strong>
                    <span>Company Learner</span>
                  </div>
                </article>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="blog-area style-one">
        <div className="container">
          <div className="row section-title-space">
            <div className="col-lg-8">
              <div className="section_title">
                <h2 className="workiz-home-title">From the blog</h2>
                <p className="workiz-section-lede">
                  Explore useful insights on learning, professional development, workplace skills, and adapting to a
                  changing world.
                </p>
              </div>
            </div>
          </div>
          <div className="row">
            {posts.map((post) => (
              <div className="col-xl-4 col-lg-6 col-md-6" key={post.slug}>
                <BlogCard post={post} />
              </div>
            ))}
          </div>
        </div>
      </div>

      <SiteFooter />
    </>
  );
}
