import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { HomeCoursesCarousel } from "@/components/HomeCoursesCarousel";
import { BlogCard } from "@/components/BlogCard";
import { BLOG_POSTS } from "@/lib/blog";
import { publicApi } from "@/lib/session";
import type { Course } from "@workix/db/types";

const fallbackCourses: Course[] = [
  {
    id: "demo-1",
    slug: "leadership-foundations",
    title: "Leadership Foundations",
    subtitle: "Lead teams with clarity and calm.",
    description: null,
    thumbnail_url: "/assets/images/home-one/case-thumb1.jpg",
    price_cents: 7900,
    currency: "usd",
    published: true,
    duration_minutes: 180,
    level: "Business",
  },
  {
    id: "demo-2",
    slug: "product-thinking",
    title: "Product Thinking for Operators",
    subtitle: "Ship work that customers actually want.",
    description: null,
    thumbnail_url: "/assets/images/home-one/case-thumb2.jpg",
    price_cents: 9900,
    currency: "usd",
    published: true,
    duration_minutes: 240,
    level: "Product",
  },
  {
    id: "demo-3",
    slug: "workplace-communication",
    title: "Workplace Communication",
    subtitle: "Write and speak so people act.",
    description: null,
    thumbnail_url: "/assets/images/home-one/case-thumb3.jpg",
    price_cents: 5900,
    currency: "usd",
    published: true,
    duration_minutes: 120,
    level: "Communication",
  },
  {
    id: "demo-4",
    slug: "cultural-awareness",
    title: "Cultural Awareness at Work",
    subtitle: "Build inclusive teams across cultures.",
    description: null,
    thumbnail_url: "/assets/images/home-one/case-thumb1.jpg",
    price_cents: 6900,
    currency: "usd",
    published: true,
    duration_minutes: 150,
    level: "Culture",
  },
  {
    id: "demo-5",
    slug: "financial-literacy",
    title: "Financial Literacy Essentials",
    subtitle: "Practical money skills for professionals.",
    description: null,
    thumbnail_url: "/assets/images/home-one/case-thumb2.jpg",
    price_cents: 8900,
    currency: "usd",
    published: true,
    duration_minutes: 200,
    level: "Finance",
  },
  {
    id: "demo-6",
    slug: "professional-skills",
    title: "Professional Skills Development",
    subtitle: "Habits that raise workplace performance.",
    description: null,
    thumbnail_url: "/assets/images/home-one/case-thumb3.jpg",
    price_cents: 7500,
    currency: "usd",
    published: true,
    duration_minutes: 165,
    level: "Skills",
  },
];

const fallbackInstructors = [
  { slug: "john-alexon", name: "John D. Alexon", headline: "Leadership Coach", photo: "/assets/images/home-one/team-thumb1.png" },
  { slug: "anjelina-watson", name: "Anjelina Watson", headline: "Product Specialist", photo: "/assets/images/home-one/team-thumb2.png" },
  { slug: "jakulin-farnandez", name: "Jakulin Farnandez", headline: "People Ops", photo: "/assets/images/home-one/team-thumb3.png" },
  { slug: "david-watson", name: "David X. Watson", headline: "Communications", photo: "/assets/images/home-one/team-thumb4.png" },
];

type HomeInstructor = (typeof fallbackInstructors)[number];

async function loadHome() {
  try {
    const [coursesRes, instructorsRes] = await Promise.all([
      fetch(`${publicApi()}/courses`, { next: { revalidate: 30 } }),
      fetch(`${publicApi()}/instructors`, { next: { revalidate: 30 } }),
    ]);
    const coursesJson = coursesRes.ok ? await coursesRes.json() : { courses: [] };
    const instructorsJson = instructorsRes.ok ? await instructorsRes.json() : { instructors: [] };
    const courses: Course[] = coursesJson.courses?.length ? coursesJson.courses.slice(0, 9) : fallbackCourses;
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
    return { courses, instructors };
  } catch {
    return { courses: fallbackCourses, instructors: fallbackInstructors };
  }
}

export default async function HomePage() {
  const { courses, instructors } = await loadHome();
  return (
    <>
      <SiteHeader />

      <section className="hero_area style-one d-flex align-items-center">
        <div className="container">
          <div className="row align-items-center">
            <div className="col-lg-6">
              <div className="hero_content">
                <h5>
                  <i className="bi bi-check2" /> 100% Satisfaction Guarantee
                </h5>
                <h1>Professional Training</h1>
                <h1>for Modern Teams</h1>
                <p>
                  <strong>Workiz Support Solutions - FZCO</strong> delivers practical online learning for organizations.
                  Contract seats, let your company admin create employee accounts, and assign courses by department.
                </p>
                <div className="hero-button">
                  <div className="hero-btn">
                    <Link href="/pricing">
                      FOR COMPANIES <i className="flaticon flaticon-right-arrow" />
                    </Link>
                  </div>
                  <div className="hero-course-btn">
                    <Link href="/courses">
                      VIEW COURSES <i className="flaticon flaticon-right-arrow" />
                    </Link>
                  </div>
                </div>
              </div>
              <div className="hero-rating-box">
                <div className="hero-rating-icon">
                  <img src="/assets/images/home-one/star-icon.png" alt="star" />
                  <span>1k+</span>
                </div>
                <div className="hero-rating-item-box">
                  <div className="hero-star-icon">
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
                        <i className="fa-solid fa-star" />
                      </li>
                    </ul>
                  </div>
                  <div className="hero-rating-num">
                    <span>(4.7 Ratings)</span>
                  </div>
                  <div className="hero-rating-des">
                    <p>Students learn daily with Workiz platform</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-lg-6">
              <div className="hero-thumb-wrapper">
                <div className="hero-thumb">
                  <img src="/assets/images/home-one/hero-thumb1.png" alt="Learner" />
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
                    <h3 className="counter">130</h3>
                    <span>+</span>
                    <p>Expert Instructor</p>
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
            <div className="col-lg-6">
              <div className="section-sub-title">
                <h6>core features</h6>
              </div>
            </div>
            <div className="col-lg-6">
              <div className="section_title">
                <h1>Interactive Online Learning</h1>
                <h1>Key Features & Benefits</h1>
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
                  <h4 className="feature-title">Learning Experiences</h4>
                  <p className="feature-desc">Recorded lessons, quizzes, and certificates built for busy professionals.</p>
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
                  <h4 className="feature-title">Professional Instructor</h4>
                  <p className="feature-desc">Experienced trainers delivering practical programs for workplace teams.</p>
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
                  <h4 className="feature-title">Company Seat Licenses</h4>
                  <p className="feature-desc">
                    Contract seats for your workforce. Admins create accounts and assign the right courses.
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
              <div className="about-thumb-wrapper">
                <div className="about-thumb">
                  <img src="/assets/images/home-one/about-thumb1.png" alt="" />
                </div>
                <div className="about-thumb-shape1 bounce-animate-3">
                  <img src="/assets/images/home-one/about-shape1.png" alt="" />
                </div>
                <div className="about-thumb-shape2 rotateme">
                  <img src="/assets/images/home-one/about-shape2.png" alt="" />
                </div>
                <div className="about-thumb-shape3">
                  <img src="/assets/images/home-one/about-shape3.png" alt="" />
                </div>
              </div>
            </div>
            <div className="col-xl-6 col-lg-12" data-reveal style={{ ["--reveal-delay" as string]: "100ms" }}>
              <div className="about_content">
                <div className="section-sub-title">
                  <h6>ABOUT US</h6>
                </div>
                <div className="section_title">
                  <h1>Who We Are – Workiz Support</h1>
                  <h1>Solutions FZCO, Dubai</h1>
                </div>
                <div className="section-title-desc">
                  <p>
                    A Dubai Silicon Oasis training company delivering practical online learning for professionals.
                    Companies contract seats; admins create employee accounts and assign courses by department.
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
                        <h3 className="counter">30</h3>
                        <span>+</span>
                      </div>
                      <div className="about-item-desc">
                        <p>Expert and Professional all Instructor</p>
                      </div>
                    </div>
                  </div>
                  <div className="col-lg-6">
                    <div className="about-item-box two">
                      <div className="about-iteam-count">
                        <h3 className="counter">6</h3>
                        <span>k+</span>
                      </div>
                      <div className="about-item-desc last">
                        <p>
                          Enrolled Students all
                          <br />
                          Over the World
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="about-btn">
                  <Link href="/about">
                    more about <i className="flaticon flaticon-right-arrow" />
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
                    unique knowledge
                  </h3>
                  <h3>
                    <span>
                      <img src="/assets/images/home-one/marquee-icon.png" alt="" />
                    </span>
                    dream today
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
                    unique knowledge
                  </h3>
                  <h3>
                    <span>
                      <img src="/assets/images/home-one/marquee-icon.png" alt="" />
                    </span>
                    dream today
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
                <h1>Our Courses – Comprehensive</h1>
                <h1>Available all programs</h1>
              </div>
            </div>
          </div>
        </div>
        <div className="container">
          <HomeCoursesCarousel courses={courses} />
          <div className="text-center mt-4 mb-2">
            <Link href="/courses" className="btn btn_primary">
              View all courses <i className="flaticon flaticon-right-arrow" />
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
                  <h6>why choose us?</h6>
                </div>
                <div className="section_title">
                  <h1>Innovative and effective</h1>
                  <h1>learning approaches</h1>
                </div>
                <div className="section-title-desc">
                  <p>
                    Contract seats for your workforce. Company admins create learner accounts, assign courses by
                    department, and track progress — language, cultural, financial, and specialized professional
                    programs.
                  </p>
                </div>
                <div className="choose-item-menu">
                  <ul>
                    <li>
                      <img src="/assets/images/home-one/choose-icon1.png" alt="" /> Admin Course Assignment
                    </li>
                    <li>
                      <img src="/assets/images/home-one/choose-icon2.png" alt="" /> Department Progress Tracking
                    </li>
                    <li>
                      <img src="/assets/images/home-one/choose-icon3.png" alt="" /> Recorded Video Lessons
                    </li>
                    <li>
                      <img src="/assets/images/home-one/choose-icon4.png" alt="" /> Quiz and Certificates
                    </li>
                  </ul>
                </div>
                <p className="choose-suport-des">
                  <img src="/assets/images/home-one/top-star.png" alt="" /> 24/7 Hrs Ready to our support team
                </p>
                <div className="choose-btn">
                  <Link href="/pricing">
                    FOR COMPANIES <i className="flaticon flaticon-right-arrow" />
                  </Link>
                </div>
              </div>
            </div>
            <div className="col-lg-5" data-reveal style={{ ["--reveal-delay" as string]: "120ms" }}>
              <div className="choose-thumb">
                <img src="/assets/images/home-one/choose-thumb1.png" alt="" />
                <div className="choose-skill-box">
                  <div className="choose-skill-icon">
                    <img src="/assets/images/home-one/choose-rat-icon.png" alt="" />
                  </div>
                  <div className="choose-skill-content">
                    <h3 className="counter">26</h3>
                    <span>+</span>
                    <p>Years of Experiences</p>
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
                  <h6>Designing</h6>
                  <h4>Creative Graphic Design</h4>
                  <h4>With Adobe Suite</h4>
                  <div className="offer-rating">
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
                    <div className="offer-rating-rate">
                      <span>(4.5/3 Ratings)</span>
                    </div>
                    <div className="course-offer-price">
                      <span>Company training</span>
                    </div>
                  </div>
                  <div className="course-offer-btn">
                    <Link href="/courses">
                      View courses <i className="flaticon flaticon-right-arrow" />
                    </Link>
                  </div>
                </div>
                <div className="offer-thumb">
                  <img src="/assets/images/home-one/offer-thumb.png" alt="" />
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
                <h6>INSTRUCTOR</h6>
              </div>
            </div>
            <div className="col-lg-6">
              <div className="section_title">
                <h1>Introducing the Educators and</h1>
                <h1>Professional Instructor</h1>
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
          <div className="team-shape1">
            <img src="/assets/images/home-one/team-shape1.png" alt="" />
          </div>
        </div>
      </div>

      <div className="testimonial-area style-one">
        <div className="container">
          <div className="row section-title-space align-items-center" data-reveal>
            <div className="col-lg-6">
              <div className="section-sub-title">
                <h6>TESTIMONIALS</h6>
              </div>
            </div>
            <div className="col-lg-6">
              <div className="section_title">
                <h1>Real Experiences From Our</h1>
                <h1>Dedicated Learners</h1>
              </div>
            </div>
          </div>
          <div className="row">
            <div className="col-lg-6" data-reveal>
              <div className="testi-thumb-wrapper">
                <div className="testimonial-thumb">
                  <img src="/assets/images/home-one/testi-thumb.png" alt="" />
                </div>
                <div className="testi-dot-shape">
                  <img src="/assets/images/home-one/testi-dot.png" alt="" />
                </div>
                <div className="testi-map-shape">
                  <img src="/assets/images/home-one/testi-map.png" alt="" />
                </div>
              </div>
            </div>
            <div className="col-lg-6" data-reveal style={{ ["--reveal-delay" as string]: "100ms" }}>
              <div className="testi-box">
                <div className="single-testi-box">
                  <div className="testi-quote">
                    <img src="/assets/images/home-one/testi-quote.png" alt="" />
                  </div>
                  <div className="testi-title">
                    <h3>Impresive Learning!</h3>
                  </div>
                  <div className="testi-desc">
                    <p>
                      Our company admin created accounts for every department and assigned cultural and skills courses
                      in minutes. Progress and certificates stay visible in one place.
                    </p>
                  </div>
                  <div className="testi-ratting">
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
                </div>
                <div className="testi-autor-box">
                  <div className="testi-autor">
                    <img src="/assets/images/home-one/testi-autor1.png" alt="" />
                  </div>
                  <div className="testi-autor-content">
                    <h5 className="autor-title">Sonia Sara</h5>
                    <p className="autor-desi">Students</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

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
                <h1>Read the Latest Insights and</h1>
                <h1>Updates from WORKIZ</h1>
              </div>
            </div>
          </div>
          <div className="row">
            {BLOG_POSTS.map((post) => (
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
