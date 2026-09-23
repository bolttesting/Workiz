"use client";

import { useState } from "react";
import Link from "next/link";
import { SiteFooter, SiteHeader, Breadcrumb } from "@/components/SiteChrome";

const FAQS = [
  {
    q: "Who is Workiz for?",
    a: "Workiz supports individuals, professionals, and organizations through practical online training. Companies can create employee accounts and assign courses based on departments, roles, and development needs.",
  },
  {
    q: "How do company seat contracts work?",
    a: "Companies can arrange training access for their teams based on workforce requirements. Administrators can manage employee accounts and assign relevant courses across departments.",
  },
  {
    q: "What training areas do you cover?",
    a: "Our training areas include language learning, financial awareness, professional skills, cultural adaptation, career development, and specialized programs.",
  },
  {
    q: "Where is Workiz based?",
    a: "Workiz is based in Dubai Silicon Oasis, Dubai, UAE, and provides flexible online training opportunities for learners and organizations.",
  },
  {
    q: "How do I reset my password?",
    a: "Having trouble accessing your account? Follow the password recovery steps on the Sign In page to set up access again. For additional support, reach out to our team.",
  },
  {
    q: "Who do I contact for company onboarding?",
    a: "Our team can help you explore company training options and onboarding requirements. Visit the Contact Us page to discuss your organization’s needs.",
  },
];

export default function FaqPage() {
  const [open, setOpen] = useState(0);

  return (
    <>
      <SiteHeader />
      <Breadcrumb title="FAQ" crumb="FAQ" />

      <section className="workiz-faq">
        <div className="container">
          <header className="workiz-faq__head">
            <p className="workiz-faq__eyebrow">FREQUENTLY ASKED QUESTIONS</p>
            <h1 className="workiz-faq__title">Frequently Asked Queries Regarding Workiz</h1>
            <p className="workiz-faq__lede">
              Find clear answers about who Workiz is for, how company training works, and how to get started with our
              online programs.
            </p>
          </header>

          <div className="workiz-faq__layout">
            <aside className="workiz-faq__aside">
              <div className="workiz-faq__aside-media">
                <img src="/assets/images/home-one/faq-intro.png" alt="Workiz learner ready to help with questions" />
              </div>
            </aside>

            <div className="workiz-faq__list" role="list">
              {FAQS.map((item, i) => {
                const active = open === i;
                const panelId = `faq-panel-${i}`;
                const buttonId = `faq-button-${i}`;
                return (
                  <article
                    key={item.q}
                    className={`workiz-faq__item${active ? " is-open" : ""}`}
                    role="listitem"
                  >
                    <button
                      type="button"
                      id={buttonId}
                      className="workiz-faq__question"
                      aria-expanded={active}
                      aria-controls={panelId}
                      onClick={() => setOpen(active ? -1 : i)}
                    >
                      <span className="workiz-faq__index">{String(i + 1).padStart(2, "0")}</span>
                      <span className="workiz-faq__question-text">{item.q}</span>
                      <span className="workiz-faq__toggle" aria-hidden="true" />
                    </button>
                    <div
                      id={panelId}
                      role="region"
                      aria-labelledby={buttonId}
                      className="workiz-faq__answer"
                      hidden={!active}
                    >
                      <p>{item.a}</p>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <div className="workiz-about-theme__cta">
        <div className="container">
          <div className="workiz-faq-cta">
            <div className="workiz-faq-cta__main">
              <p className="workiz-faq-cta__eyebrow">Need more help?</p>
              <h3>Still have questions?</h3>
              <p className="workiz-faq-cta__text">
                Our team can help with company onboarding, course access, and learning support.
              </p>
            </div>
            <div className="workiz-faq-cta__actions">
              <Link href="/contact" className="workiz-about-cta workiz-about-cta--light">
                Contact Us
                <i className="flaticon flaticon-right-arrow" />
              </Link>
              <Link href="/courses" className="workiz-faq-cta__secondary">
                View Courses
                <i className="flaticon flaticon-right-arrow" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      <SiteFooter />
    </>
  );
}
