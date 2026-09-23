import Link from "next/link";
import { SiteFooter, SiteHeader, Breadcrumb } from "@/components/SiteChrome";

const HIGHLIGHTS = [
  "Based in Dubai Silicon Oasis, Dubai, UAE",
  "Practical training programs for individuals and professional teams",
  "Flexible online learning supported by experienced trainers",
];

const PILLARS = [
  {
    title: "Accessible",
    blurb: "Online learning opportunities that fit different schedules, locations, and learning needs.",
  },
  {
    title: "Relevant",
    blurb:
      "Training built around practical knowledge, workplace requirements, and personal development goals.",
  },
  {
    title: "Useful",
    blurb:
      "Learning that helps people apply new knowledge to their work, daily responsibilities, and future plans.",
  },
];

const TRAINING_AREAS = [
  {
    title: "Language Training",
    blurb:
      "Improve communication through practical language learning designed for workplace interactions, everyday conversations, and greater confidence in different environments.",
    image: "/assets/images/home-one/portfolio-language.jpg",
  },
  {
    title: "Financial Training",
    blurb:
      "Develop a better understanding of budgeting, responsible spending, savings, and financial decisions that support personal and professional stability.",
    image: "/assets/images/home-one/portfolio-financial.jpg",
  },
  {
    title: "Professional Skills",
    blurb:
      "Build essential workplace skills through training in communication, teamwork, professional behaviour, and effective collaboration.",
    image: "/assets/images/home-one/portfolio-professional.jpg",
  },
  {
    title: "Cultural Training",
    blurb:
      "Develop cultural awareness and learn to navigate different social expectations, communication styles, and workplace environments.",
    image: "/assets/images/home-one/portfolio-cultural.jpg",
  },
  {
    title: "Career Development",
    blurb:
      "Support your professional growth with learning opportunities that strengthen existing abilities, encourage new skills, and prepare you for future opportunities.",
    image: "/assets/images/home-one/portfolio-career.jpg",
  },
  {
    title: "Specialized Programs",
    blurb:
      "Explore focused learning opportunities across technical, practical, and professional areas based on your specific development needs.",
    image: "/assets/images/home-one/portfolio-specialized.jpg",
  },
];

const COMPANY_SOLUTIONS = [
  {
    title: "Company Contracts",
    blurb:
      "Create training arrangements for your organization based on team requirements, employee development goals, and the skills your workforce needs.",
  },
  {
    title: "Admin Assignment",
    blurb:
      "Support organized employee learning by helping teams identify relevant courses and direct employees towards training suited to their roles and responsibilities.",
  },
  {
    title: "Professional Training",
    blurb:
      "Explore learning opportunities covering workplace communication, professional skills, cultural awareness, and other areas that support employee development.",
  },
];

export default function AboutPage() {
  return (
    <>
      <SiteHeader />
      <Breadcrumb title="About Us" crumb="About Us" />

      {/* Intro */}
      <section className="workiz-about-intro-section">
        <div className="container">
          <div className="workiz-about-intro-section__grid">
            <div className="workiz-about-intro-section__media" data-reveal>
              <img
                src="/assets/images/home-one/about-page-intro.png"
                alt="Workiz learner with design portfolio"
              />
            </div>

            <div
              className="workiz-about-intro-section__copy"
              data-reveal
              style={{ ["--reveal-delay" as string]: "100ms" }}
            >
              <p className="workiz-about-intro-section__eyebrow">ABOUT US</p>
              <h1 className="workiz-about-intro-section__title">
                Progress-Oriented Training from Dubai
              </h1>
              <div className="workiz-about-intro-section__lede">
                <p>
                  Workiz is a Dubai-based training and development company committed to making learning practical,
                  accessible, and relevant to the needs of today&apos;s individuals and professionals.
                </p>
                <p>
                  Based in Dubai Silicon Oasis, we provide online training opportunities designed to support
                  professional development, workplace learning, and personal growth.
                </p>
              </div>
              <ul className="workiz-about-intro-section__points">
                {HIGHLIGHTS.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <div className="workiz-about-intro-section__actions">
                <Link href="/pricing" className="workiz-about-cta">
                  FOR COMPANIES
                  <i className="flaticon flaticon-right-arrow" />
                </Link>
                <Link href="/courses" className="workiz-about-intro-section__link">
                  Explore Courses
                  <i className="flaticon flaticon-right-arrow" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Objective */}
      <section className="workiz-about-theme__objective">
        <div className="container">
          <div className="workiz-objective-head">
            <p className="workiz-objective__eyebrow">OUR OBJECTIVE</p>
            <h2 className="workiz-objective__title">
              Learning That Creates <span>Real-World Impact</span>
            </h2>
            <p className="workiz-objective__tagline">
              Practical Skills. Greater Confidence. New Opportunities.
            </p>
          </div>

          <div className="workiz-objective">
            <div className="workiz-objective__media">
              <img
                src="/assets/images/home-one/about-objective.jpg"
                alt="Workiz team collaborating on training goals"
              />
            </div>
            <div className="workiz-objective__copy">
              <p>
                Through flexible online learning, experienced trainers, and practical course content, Workiz aims to
                help learners build knowledge, develop new skills, and enhance their professional and personal
                capabilities.
              </p>
              <p>
                We believe learning should not be limited by location, age, or professional background. Whether you are
                looking to acquire a new skill, strengthen your existing knowledge, advance your career, or explore a
                new area of interest, our goal is to make learning useful and easier to access.
              </p>
              <p>
                At Workiz, we focus on training that connects with real needs. From workplace communication and
                professional skills to financial awareness and personal development, our learning opportunities are
                designed to help people move forward with greater knowledge and confidence.
              </p>
            </div>
          </div>

          <div className="workiz-objective-pillars">
            {PILLARS.map((pillar) => (
              <article key={pillar.title} className="workiz-pillar-card">
                <h3>{pillar.title}</h3>
                <p>{pillar.blurb}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Training portfolio */}
      <section className="workiz-about-theme__portfolio">
        <div className="container">
          <div className="workiz-about-section-head">
            <div className="section-sub-title three">
              <h6>TRAINING PORTFOLIO</h6>
            </div>
            <div className="section_title">
              <h1>Programs Companies Assign by Role</h1>
            </div>
            <p className="workiz-about-section-lede">
              Different roles come with different responsibilities. Workiz brings together training opportunities across
              multiple areas to support employee development, workplace effectiveness, and individual learning goals.
              Whether your team needs stronger communication skills, greater financial awareness, or role-specific
              knowledge, our training categories provide a starting point for building a more capable workforce.
            </p>
          </div>

          <div className="workiz-portfolio-grid">
            {TRAINING_AREAS.map((area, index) => (
              <article key={area.title} className="workiz-portfolio-card">
                <div className="workiz-portfolio-card__media">
                  <img src={area.image} alt={area.title} />
                  <span className="workiz-portfolio-card__scrim" aria-hidden="true" />
                  <span className="workiz-portfolio-card__index">{String(index + 1).padStart(2, "0")}</span>
                </div>
                <div className="workiz-portfolio-card__body">
                  <h3>{area.title}</h3>
                  <p>{area.blurb}</p>
                  <Link href="/courses" className="workiz-portfolio-card__link">
                    Browse courses
                    <i className="flaticon flaticon-right-arrow" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Company training */}
      <section className="workiz-about-theme__features">
        <div className="container">
          <div className="workiz-about-section-head">
            <div className="section-sub-title three">
              <h6>COMPANY TRAINING</h6>
            </div>
            <div className="section_title">
              <h1>Training That Supports Your Workforce</h1>
            </div>
            <p className="workiz-about-section-lede">
              A capable workforce grows through continuous learning. Workiz offers training opportunities that
              organizations can use to support employee development, strengthen workplace skills, and encourage a
              culture of learning. Whether you are preparing new employees, supporting existing teams, or developing
              skills across different departments, our training approach focuses on relevant learning that fits your
              organization&apos;s needs.
            </p>
          </div>

          <div className="workiz-company-grid">
            {COMPANY_SOLUTIONS.map((item, index) => (
              <article key={item.title} className="workiz-company-card">
                <span className="workiz-company-card__index">{String(index + 1).padStart(2, "0")}</span>
                <h3>{item.title}</h3>
                <p>{item.blurb}</p>
                <Link href="/pricing" className="workiz-portfolio-card__link">
                  Learn more
                  <i className="flaticon flaticon-right-arrow" />
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <div className="workiz-about-theme__cta">
        <div className="container">
          <div className="workiz-about-cta-strip">
            <div className="workiz-about-cta-strip__copy">
              <h3>Your Next Step Starts Here</h3>
              <p>Build Skills. Expand Possibilities. Shape Your Future.</p>
            </div>
            <Link href="/contact" className="workiz-about-cta workiz-about-cta--light">
              Talk to us
              <i className="flaticon flaticon-right-arrow" />
            </Link>
          </div>
        </div>
      </div>

      <SiteFooter />
    </>
  );
}
