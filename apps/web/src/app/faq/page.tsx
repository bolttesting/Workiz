"use client";

import { useState } from "react";
import Link from "next/link";
import { SiteFooter, SiteHeader, Breadcrumb } from "@/components/SiteChrome";

const FAQS = [
  {
    q: "Who is Workiz for?",
    a: "Workiz Support Solutions - FZCO serves professionals and organizations. Companies contract learning seats for employees; company admins create accounts and assign the right courses by department or role.",
  },
  {
    q: "How do company seat contracts work?",
    a: "Your organization contracts a number of seats — for example 100 employees across four departments. The company admin account manages those seats, creates learner logins, and assigns courses such as cultural training, professional skills, or specialized programs.",
  },
  {
    q: "What training areas do you cover?",
    a: "Our portfolio includes Language Training, Financial Training, Professional Skills Development, Cultural Training, Personal and Career Development, and other specialized programs.",
  },
  {
    q: "Where is Workiz based?",
    a: "Workiz Support Solutions - FZCO is based in Dubai Silicon Oasis, Dubai, UAE, and delivers flexible online learning for today’s changing workplace.",
  },
  {
    q: "How do I reset my password?",
    a: "Use Forgot password on the sign-in page. If that email has an account, we send a secure reset link.",
  },
  {
    q: "Who do I contact for company onboarding?",
    a: "Email hello@workiz.com or use the Contact page. We can walk through contracts, seats, admin setup, and assigning courses to your teams.",
  },
];

export default function FaqPage() {
  const [open, setOpen] = useState(0);

  return (
    <>
      <SiteHeader />
      <Breadcrumb title="Faq" crumb="Faq" />

      <div className="faq-area style-one workiz-faq">
        <div className="container">
          <div className="row align-items-center">
            <div className="col-xl-6 col-lg-12">
              <div className="workiz-faq__media">
                <img
                  src="/assets/images/home-one/about-thumb1.png"
                  alt="Workiz support and learning"
                />
              </div>
            </div>
            <div className="col-xl-6 col-lg-12">
              <div className="section-sub-title three">
                <h6>frequently asked questions</h6>
              </div>
              <div className="section_title">
                <h1>What you want to know about</h1>
                <h1>Workiz Platform</h1>
              </div>

              <div className="tab_container">
                <div id="tab1" className="tab_content">
                  <ul className="faq-accordion">
                    {FAQS.map((item, i) => {
                      const active = open === i;
                      return (
                        <li key={item.q}>
                          <a
                            href="#faq"
                            className={active ? "active" : undefined}
                            onClick={(e) => {
                              e.preventDefault();
                              setOpen(active ? -1 : i);
                            }}
                          >
                            <span />
                            {item.q}
                          </a>
                          <p style={{ display: active ? "block" : "none" }}>
                            <strong>Answer :</strong> {item.a}
                          </p>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>

              <div className="faq-button">
                <Link href="/contact">
                  Contact us
                  <i className="flaticon flaticon-right-arrow" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="call-to-action style-two workiz-about-theme__cta">
        <div className="container">
          <div className="row align-items-center">
            <div className="col-lg-6">
              <div className="call-to-title">
                <h3>Your learning journey begins here</h3>
                <h3>Explore all programs today</h3>
              </div>
            </div>
            <div className="col-lg-6">
              <div className="call-to-btn">
                <Link href="/courses">
                  View courses
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
