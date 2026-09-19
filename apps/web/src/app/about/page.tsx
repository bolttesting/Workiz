import Link from "next/link";
import { SiteFooter, SiteHeader, Breadcrumb } from "@/components/SiteChrome";

const HIGHLIGHTS = [
  "Based in Dubai Silicon Oasis, Dubai, UAE",
  "Practical programs for professional teams",
  "Flexible online learning with experienced trainers",
];

const TRAINING_AREAS = [
  {
    title: "Language Training",
    blurb: "Workplace language programs teams can assign by department and role.",
    image: "/assets/images/home-one/case-thumb1.jpg",
  },
  {
    title: "Financial Training",
    blurb: "Practical finance skills for operators, managers, and growing teams.",
    image: "/assets/images/home-one/case-thumb2.jpg",
  },
  {
    title: "Professional Skills",
    blurb: "Leadership, communication, and delivery skills for modern workplaces.",
    image: "/assets/images/home-one/case-thumb3.jpg",
  },
  {
    title: "Cultural Training",
    blurb: "Cross-cultural readiness for teams working across markets and regions.",
    image: "/assets/images/home-one/blog-thumb1.png",
  },
  {
    title: "Career Development",
    blurb: "Personal growth paths admins can assign to high-potential employees.",
    image: "/assets/images/home-one/blog-thumb2.png",
  },
  {
    title: "Specialized Programs",
    blurb: "Trade, technical, and niche training tailored to your workforce plan.",
    image: "/assets/images/home-one/blog-thumb3.png",
  },
];

export default function AboutPage() {
  return (
    <>
      <SiteHeader />
      <Breadcrumb title="About Us" crumb="About Us" />

      {/* Theme: educate About Area style-three — cleaned (no floating boxes) */}
      <section className="about-area style-three inner workiz-about-theme">
        <div className="container">
          <div className="row align-items-center">
            <div className="col-xl-6 col-lg-12">
              <div className="about-thumb-wrapper workiz-about-theme__media">
                <div className="about-thumb">
                  <img src="/assets/images/home-one/about-thumb1.png" alt="About Workiz" />
                </div>
              </div>
            </div>
            <div className="col-xl-6 col-lg-12">
              <div className="about_content">
                <div className="section-sub-title three">
                  <h6>ABOUT US</h6>
                </div>
                <div className="section_title">
                  <h1>Workiz Support Solutions</h1>
                  <h1>FZCO — Dubai</h1>
                </div>
                <div className="section-title-desc">
                  <p>
                    Workiz Support Solutions - FZCO is a Dubai-based training and development company committed to
                    providing practical, accessible, and high-quality online learning opportunities for individuals and
                    professionals.
                  </p>
                </div>
                <div className="about-iteam-list">
                  <ul>
                    {HIGHLIGHTS.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
                <div className="about-iteam-phone">
                  <p>
                    <a href="mailto:hello@workiz.com">hello@workiz.com</a>
                  </p>
                </div>
                <div className="about-btn">
                  <Link href="/pricing">
                    For companies
                    <i className="flaticon flaticon-right-arrow" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Objective — image + copy */}
      <section className="workiz-about-theme__objective">
        <div className="container">
          <div className="workiz-objective">
            <div className="workiz-objective__media">
              <img src="/assets/images/home-one/case-thumb2.jpg" alt="" />
            </div>
            <div className="workiz-objective__copy">
              <p className="workiz-objective__eyebrow">Our objective</p>
              <h2 className="workiz-objective__title">
                Meaningful learning —
                <span> accessible, relevant, useful.</span>
              </h2>
              <p>
                Through flexible online learning, experienced trainers, and practical course content, Workiz Support
                Solutions - FZCO aims to help learners build knowledge, develop new skills, and enhance their
                professional and personal capabilities.
              </p>
              <p>
                We believe learning should not be limited by location, age, or professional background.
              </p>
              <ul className="workiz-objective__pillars">
                <li>
                  <strong>Accessible</strong>
                  <span>Online programs your teams can take anywhere</span>
                </li>
                <li>
                  <strong>Relevant</strong>
                  <span>Built for real workplace roles and departments</span>
                </li>
                <li>
                  <strong>Useful</strong>
                  <span>Skills people apply the same week they learn</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Training portfolio with images */}
      <section className="workiz-about-theme__portfolio">
        <div className="container">
          <div className="section-sub-title three text-center">
            <h6>TRAINING PORTFOLIO</h6>
          </div>
          <div className="section_title text-center">
            <h1>Programs companies assign by role</h1>
          </div>
          <div className="row workiz-about-theme__portfolio-grid">
            {TRAINING_AREAS.map((area, index) => (
              <div key={area.title} className="col-lg-4 col-md-6">
                <article className="workiz-portfolio-card">
                  <div className="workiz-portfolio-card__media">
                    <img src={area.image} alt="" />
                    <span className="workiz-portfolio-card__scrim" aria-hidden="true" />
                    <span className="workiz-portfolio-card__index">
                      {String(index + 1).padStart(2, "0")}
                    </span>
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
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Theme: feature Area style-two — company model */}
      <section className="feature-area style-two workiz-about-theme__features">
        <div className="container">
          <div className="row">
            <div className="col-xl-4 col-lg-6 col-md-6">
              <div className="single-feature-box box-1">
                <div className="workiz-about-theme__feature-media">
                  <img src="/assets/images/home-one/case-thumb1.jpg" alt="" />
                </div>
                <div className="feature-content">
                  <h4 className="feature-title">Company Contracts</h4>
                  <p className="feature-desc">
                    Organizations contract seats for their workforce — for example 100 employees across departments.
                  </p>
                </div>
              </div>
            </div>
            <div className="col-xl-4 col-lg-6 col-md-6">
              <div className="single-feature-box box-2">
                <div className="workiz-about-theme__feature-media">
                  <img src="/assets/images/home-one/case-thumb2.jpg" alt="" />
                </div>
                <div className="feature-content">
                  <h4 className="feature-title">Admin Assignment</h4>
                  <p className="feature-desc">
                    Company admins create learner accounts and assign the right courses by role or department.
                  </p>
                </div>
              </div>
            </div>
            <div className="col-xl-4 col-lg-6 col-md-6">
              <div className="single-feature-box box-3">
                <div className="workiz-about-theme__feature-media">
                  <img src="/assets/images/home-one/case-thumb3.jpg" alt="" />
                </div>
                <div className="feature-content">
                  <h4 className="feature-title">Professional Training</h4>
                  <p className="feature-desc">
                    From cultural training to trade and professional skills — practical programs for today’s workplace.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Theme: call to action — white */}
      <div className="call-to-action style-two workiz-about-theme__cta">
        <div className="container">
          <div className="row align-items-center">
            <div className="col-lg-6">
              <div className="call-to-title">
                <h3>Workiz Support Solutions FZCO</h3>
                <h3>Learn. Develop. Grow.</h3>
              </div>
            </div>
            <div className="col-lg-6">
              <div className="call-to-btn">
                <Link href="/contact">
                  Talk to us
                  <i className="flaticon flaticon-right-arrow" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      <SiteFooter />
    </>
  );
}
