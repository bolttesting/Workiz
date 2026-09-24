import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { HomeCoursesCarousel } from "@/components/HomeCoursesCarousel";
import { BlogCard } from "@/components/BlogCard";
import { fetchBlogPosts } from "@/lib/blog";
import { publicApi } from "@/lib/session";
import type { Course } from "@workix/db/types";

const fallbackInstructors = [
  { slug: "john-alexon", name: "John D. Alexon", headline: "Leadership Coach", photo: "/assets/images/home-one/team-thumb1.png" },
  { slug: "anjelina-watson", name: "Anjelina Watson", headline: "Product Specialist", photo: "/assets/images/home-one/team-thumb2.png" },
  { slug: "jakulin-farnandez", name: "Jakulin Farnandez", headline: "People Ops", photo: "/assets/images/home-one/team-thumb3.png" },
  { slug: "david-watson", name: "David X. Watson", headline: "Communications", photo: "/assets/images/home-one/team-thumb4.png" },
];

type HomeInstructor = (typeof fallbackInstructors)[number];

async function loadHome() {
  try {
    const [coursesRes, instructorsRes, posts] = await Promise.all([
      fetch(`${publicApi()}/courses`, { cache: "no-store" }),
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
              i: number,
            ): HomeInstructor => ({
              slug: person.slug,
              name: person.user?.full_name || "Instructor",
              headline: person.headline || "Workiz instructor",
              photo: person.user?.avatar_url || fallbackInstructors[i % 4]?.photo || "/assets/images/home-one/team-thumb1.png",
            }),
          )
        : fallbackInstructors;
    return { courses, instructors, posts: posts.slice(0, 3) };
  } catch {
    const posts = await fetchBlogPosts();
    return { courses: [] as Course[], instructors: fallbackInstructors, posts: posts.slice(0, 3) };
  }
}

export default async function HomePage() {
  const { courses, instructors, posts } = await loadHome();
  return (
    <>
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
                <p className="hero-tagline">Flexible learning. Practical knowledge. Skills you can put to work.</p>
              </div>
              <div className="hero-rating-box workiz-hero-stats">
                <div className="workiz-hero-stat">
                  <strong className="counter">1200</strong>
                  <span>+</span>
                  <p>Learners</p>
                </div>
                <div className="workiz-hero-stat">
                  <strong className="counter">97</strong>
                  <span>%</span>
                  <p>Satisfaction</p>
                </div>
              </div>
            </div>
            <div className="col-lg-6">
              <div className="hero-thumb-wrapper workiz-hero-media">
                <div className="hero-thumb">
                  <img src="/assets/images/home-one/hero-workiz.png" alt="Workiz professional training" />
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

      <div className="marquee-section workiz-trust-strip">
        <div className="container-fluid">
          <div className="row">
            <div className="col-lg-12">
              <div className="marquee">
                <div className="marquee-block">
                  <h3>
                    <span>
                      <img src="/assets/images/home-one/marquee-icon.png" alt="" />
                    </span>
                    learning innovation
                  </h3>
                  <h3>
                    <span>
                      <img src="/assets/images/home-one/marquee-icon.png" alt="" />
                    </span>
                    worldwide learners
                  </h3>
                  <h3>
                    <span>
                      <img src="/assets/images/home-one/marquee-icon.png" alt="" />
                    </span>
                    practical development
                  </h3>
                  <h3>
                    <span>
                      <img src="/assets/images/home-one/marquee-icon.png" alt="" />
                    </span>
                    continuous growth
                  </h3>
                </div>
                <div className="marquee-block">
                  <h3>
                    <span>
                      <img src="/assets/images/home-one/marquee-icon.png" alt="" />
                    </span>
                    learning innovation
                  </h3>
                  <h3>
                    <span>
                      <img src="/assets/images/home-one/marquee-icon.png" alt="" />
                    </span>
                    worldwide learners
                  </h3>
                  <h3>
                    <span>
                      <img src="/assets/images/home-one/marquee-icon.png" alt="" />
                    </span>
                    practical development
                  </h3>
                  <h3>
                    <span>
                      <img src="/assets/images/home-one/marquee-icon.png" alt="" />
                    </span>
                    continuous growth
                  </h3>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <section className="feature-area style-one">
        <div className="container">
          <div className="row align-items-center section-title-space" data-reveal>
            <div className="col-lg-6">
              <div className="section-sub-title">
                <h6>FEATURES</h6>
              </div>
            </div>
            <div className="col-lg-6">
              <div className="section_title">
                <h1>Interactive Online Learning</h1>
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
                  <img src="/assets/images/home-one/about-workiz.png" alt="Workiz learners" />
                </div>
              </div>
            </div>
            <div className="col-xl-6 col-lg-12" data-reveal style={{ ["--reveal-delay" as string]: "100ms" }}>
              <div className="about_content workiz-about-home-copy">
                <div className="section-sub-title">
                  <h6>ABOUT US</h6>
                </div>
                <div className="section_title">
                  <h1>Meet Workiz</h1>
                  <h1>Training &amp; Development, Dubai</h1>
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
                <div className="row about-border">
                  <div className="col-lg-6">
                    <div className="about-item-box">
                      <div className="about-item-count">
                        <h3 className="counter">1200</h3>
                        <span>+</span>
                      </div>
                      <div className="about-item-desc">
                        <p>Learners</p>
                      </div>
                    </div>
                  </div>
                  <div className="col-lg-6">
                    <div className="about-item-box two">
                      <div className="about-iteam-count">
                        <h3 className="counter">1000</h3>
                        <span>+</span>
                      </div>
                      <div className="about-item-desc last">
                        <p>Courses</p>
                      </div>
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

      <div className="marquee-section">
        <div className="container-fluid">
          <div className="row">
            <div className="col-lg-12">
              <div className="marquee">
                <div className="marquee-block">
                  <h3>
                    <span>
                      <img src="/assets/images/home-one/marquee-icon.png" alt="" />
                    </span>
                    learning innovation
                  </h3>
                  <h3>
                    <span>
                      <img src="/assets/images/home-one/marquee-icon.png" alt="" />
                    </span>
                    worldwide learners
                  </h3>
                  <h3>
                    <span>
                      <img src="/assets/images/home-one/marquee-icon.png" alt="" />
                    </span>
                    practical development
                  </h3>
                  <h3>
                    <span>
                      <img src="/assets/images/home-one/marquee-icon.png" alt="" />
                    </span>
                    unique knowledge
                  </h3>
                </div>
                <div className="marquee-block">
                  <h3>
                    <span>
                      <img src="/assets/images/home-one/marquee-icon.png" alt="" />
                    </span>
                    learning innovation
                  </h3>
                  <h3>
                    <span>
                      <img src="/assets/images/home-one/marquee-icon.png" alt="" />
                    </span>
                    worldwide learners
                  </h3>
                  <h3>
                    <span>
                      <img src="/assets/images/home-one/marquee-icon.png" alt="" />
                    </span>
                    practical development
                  </h3>
                  <h3>
                    <span>
                      <img src="/assets/images/home-one/marquee-icon.png" alt="" />
                    </span>
                    unique knowledge
                  </h3>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="case-study-area style-one">
        <div className="container">
          <div className="row align-items-center section-title-space" data-reveal>
            <div className="col-lg-6">
              <div className="section-sub-title">
                <h6>OUR COURSES</h6>
              </div>
            </div>
            <div className="col-lg-6">
              <div className="section_title">
                <h1>Comprehensive Learning</h1>
                <h1>for Every Stage</h1>
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
                <div className="section-sub-title">
                  <h6>WHY CHOOSE US</h6>
                </div>
                <div className="section_title">
                  <h1>Innovative and Effective</h1>
                  <h1>Learning Approaches</h1>
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
                <img src="/assets/images/home-one/why-choose-workiz.png" alt="Why choose Workiz" />
                <div className="choose-skill-box">
                  <div className="choose-skill-icon">
                    <img src="/assets/images/home-one/choose-rat-icon.png" alt="" />
                  </div>
                  <div className="choose-skill-content">
                    <h3 className="counter">500</h3>
                    <span>+</span>
                    <p>Practical learning opportunities</p>
                  </div>
                </div>
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
                <img src="/assets/images/home-one/offer-video.png" alt="" />
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
                  <h6>COMPANY TRAINING</h6>
                  <h4>Professional &amp; Workplace Skills</h4>
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
                  <img src="/assets/images/home-one/company-training-workiz.png" alt="Company training" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="team-area style-one">
        <div className="container">
          <div className="row section-title-space" data-reveal>
            <div className="col-lg-6">
              <div className="section-sub-title">
                <h6>INSTRUCTORS</h6>
              </div>
            </div>
            <div className="col-lg-6">
              <div className="section_title">
                <h1>Introducing the Educators &amp;</h1>
                <h1>Professional Instructors</h1>
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
                    <div className="team-ratting">
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
                    </div>
                    <div className="team-rating-rate">
                      <span>(4.5)</span>
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

      <section className="workiz-testimonials">
        <div className="container">
          <header className="workiz-testimonials__head" data-reveal>
            <p className="workiz-testimonials__eyebrow">TESTIMONIALS</p>
            <h2 className="workiz-testimonials__title">Real Experiences from Our Dedicated Learners</h2>
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
            <div className="col-lg-6">
              <div className="section-sub-title">
                <h6>LATEST BLOG</h6>
              </div>
            </div>
            <div className="col-lg-6">
              <div className="section_title">
                <h1>Read the Latest Insights &amp;</h1>
                <h1>Updates from Workiz</h1>
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
