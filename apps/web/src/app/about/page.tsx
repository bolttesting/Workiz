import Link from "next/link";
import { SiteFooter, SiteHeader, Breadcrumb } from "@/components/SiteChrome";

const TRAINING_AREAS = [
  "Language Training",
  "Financial Training",
  "Professional Skills Development",
  "Cultural Training",
  "Personal and Career Development",
  "Other Specialized Training Programs",
];

export default function AboutPage() {
  return (
    <>
      <SiteHeader />
      <Breadcrumb title="About Us" crumb="About Us" />

      {/* Theme: educate About Area style-three inner */}
      <section className="about-area style-three inner">
        <div className="container">
          <div className="row">
            <div className="col-xl-6 col-lg-12">
              <div className="about-thumb-wrapper">
                <div className="about-learn-box">
                  <div className="about-learn-icon">
                    <img src="/assets/images/home-three/learn-icon.png" alt="" />
                  </div>
                  <div className="learn-title">
                    <h5>
                      Learn. Develop.
                      <br />
                      Grow.
                    </h5>
                  </div>
                </div>
                <div className="about-thumb">
                  <img src="/assets/images/home-three/about-thumb31.png" alt="About Workiz" />
                </div>
                <div className="about-experience-box">
                  <div className="about-experience-count">
                    <h3>UAE</h3>
                  </div>
                  <div className="about-experience-desc">
                    <p>
                      Dubai Silicon
                      <br />
                      Oasis
                    </p>
                  </div>
                </div>
                <div className="about-shape32">
                  <img src="/assets/images/home-three/about-shape32.png" alt="" />
                </div>
              </div>
            </div>
            <div className="col-xl-6 col-lg-12">
              <div className="about_content">
                <div className="section-sub-title three">
                  <h6>
                    <img src="/assets/images/inner-img/sub-title2.png" alt="" />
                    ABOUT US
                  </h6>
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
                    <li>
                      <img src="/assets/images/home-three/about-icon31.png" alt="" />
                      Based in Dubai Silicon Oasis, Dubai, UAE
                    </li>
                    <li>
                      <img src="/assets/images/home-three/about-icon31.png" alt="" />
                      Practical programs for professional teams
                    </li>
                    <li>
                      <img src="/assets/images/home-three/about-icon31.png" alt="" />
                      Flexible online learning with experienced trainers
                    </li>
                  </ul>
                </div>
                <div className="about-iteam-phone">
                  <p>
                    <span>
                      <img src="/assets/images/home-three/about-call.png" alt="" />
                    </span>
                    hello@workiz.com
                  </p>
                </div>
                <div className="about-btn">
                  <Link href="/pricing">
                    For companies
                    <i className="flaticon flaticon-right-arrow" />
                  </Link>
                </div>
                <div className="about-education-box">
                  <div className="education-icon">
                    <span>
                      <i className="bi bi-check-lg" />
                    </span>
                  </div>
                  <div className="education-content">
                    <p>
                      Led by
                      <br />
                      Mr. Anirban Basu
                      <br />
                      General Manager
                    </p>
                    <span>Workiz Support Solutions - FZCO</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="about-shape31">
            <img src="/assets/images/home-three/about-shape31.png" alt="" />
          </div>
        </div>
      </section>

      {/* Mission + portfolio */}
      <section className="course-sign-form-area" style={{ paddingTop: 40, paddingBottom: 20 }}>
        <div className="container" style={{ maxWidth: 920 }}>
          <div className="section-sub-title three text-center">
            <h6>
              <img src="/assets/images/inner-img/sub-title2.png" alt="" />
              OUR OBJECTIVE
            </h6>
          </div>
          <div className="section_title text-center" style={{ marginBottom: 24 }}>
            <h1>Meaningful learning — accessible, relevant, useful</h1>
          </div>
          <p style={{ color: "#3f4a57", fontSize: 16, lineHeight: 1.75, textAlign: "center", marginBottom: 28 }}>
            Through flexible online learning, experienced trainers, and practical course content, Workiz Support
            Solutions - FZCO aims to help learners build knowledge, develop new skills, and enhance their professional
            and personal capabilities. We believe learning should not be limited by location, age, or professional
            background.
          </p>
          <div className="section-sub-title three text-center" style={{ marginTop: 40 }}>
            <h6>
              <img src="/assets/images/inner-img/sub-title2.png" alt="" />
              TRAINING PORTFOLIO
            </h6>
          </div>
          <div className="row" style={{ marginTop: 12 }}>
            {TRAINING_AREAS.map((area) => (
              <div key={area} className="col-md-6" style={{ marginBottom: 14 }}>
                <div
                  style={{
                    border: "1px solid rgba(16,40,70,0.12)",
                    borderRadius: 12,
                    padding: "16px 18px",
                    background: "#faf8f4",
                    color: "#102846",
                    fontWeight: 600,
                    fontFamily: "Outfit, sans-serif",
                  }}
                >
                  <img
                    src="/assets/images/home-three/about-icon31.png"
                    alt=""
                    style={{ width: 22, height: 22, marginRight: 10, verticalAlign: "middle" }}
                  />
                  {area}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Theme: feature Area style-two — professional / company model */}
      <section className="feature-area style-two">
        <div className="container">
          <div className="row">
            <div className="col-xl-4 col-lg-6 col-md-6">
              <div className="single-feature-box box-1">
                <div className="feature-icon">
                  <img src="/assets/images/home-three/feature-icon21.png" alt="" />
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
                <div className="feature-icon">
                  <img src="/assets/images/home-three/feature-icon22.png" alt="" />
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
                <div className="feature-icon">
                  <img src="/assets/images/home-three/feature-icon23.png" alt="" />
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
          <div className="feature-shape21">
            <img src="/assets/images/home-three/feature-shape21.png" alt="" />
          </div>
        </div>
      </section>

      {/* Theme: call to action style-two */}
      <div className="call-to-action style-two">
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
          <div className="call-to-shape31">
            <img src="/assets/images/home-three/call-to-arrow2.png" alt="" />
          </div>
        </div>
      </div>

      <SiteFooter />
    </>
  );
}
