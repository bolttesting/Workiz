"use client";

import { useEffect, useState } from "react";
import { Mail, Phone } from "lucide-react";
import { CONTACT_DEFAULTS, fetchPublicContact, telHref, whatsappHref, type PublicContact } from "@/lib/contact";

const STEPS = [
  { title: "Pick your seats", body: "Choose a package or a custom seat count. Prices are in AED." },
  { title: "Invite your team", body: "Send invites by email or in bulk, and group people by department." },
  { title: "Assign and track", body: "Assign courses with due dates, then follow progress, quiz results and certificates." },
];

/** Company page: how seats work, plus direct ways to reach sales before buying. */
export function CompanyTalkToUs() {
  const [contact, setContact] = useState<PublicContact>(CONTACT_DEFAULTS);

  useEffect(() => {
    void fetchPublicContact().then(setContact);
  }, []);

  const whatsapp = whatsappHref(contact.whatsapp);
  const call = telHref(contact.phone);
  const email = contact.emails[0];

  return (
    <>
      <section className="workiz-company-steps" aria-labelledby="company-steps-title">
        <div className="container">
          <h2 id="company-steps-title" className="workiz-home-title text-center">
            How company training works
          </h2>
          <ol className="workiz-company-steps__list">
            {STEPS.map((step, index) => (
              <li key={step.title}>
                <span className="workiz-company-steps__num" aria-hidden="true">
                  {index + 1}
                </span>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="workiz-company-talk" aria-labelledby="company-talk-title">
        <div className="container">
          <div className="workiz-company-talk__card">
            <div>
              <h2 id="company-talk-title">Not sure which package fits?</h2>
              <p>Tell us your team size and goals. We will suggest the right seats and courses.</p>
            </div>
            <div className="workiz-company-talk__actions">
              {whatsapp ? (
                <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="workiz-company-talk__primary">
                  Chat on WhatsApp
                </a>
              ) : null}
              {call ? (
                <a href={call} className="workiz-company-talk__secondary">
                  <Phone size={16} aria-hidden="true" /> {contact.phone}
                </a>
              ) : null}
              {email ? (
                <a href={`mailto:${email}`} className="workiz-company-talk__secondary">
                  <Mail size={16} aria-hidden="true" /> {email}
                </a>
              ) : null}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
