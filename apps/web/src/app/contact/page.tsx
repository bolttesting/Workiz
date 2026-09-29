"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { SiteFooter, SiteHeader, Breadcrumb } from "@/components/SiteChrome";
import { CONTACT_DEFAULTS, fetchPublicContact, telHref, whatsappHref, type PublicContact } from "@/lib/contact";
import {
  Map,
  MapMarker,
  MarkerContent,
  MarkerPopup,
  MarkerTooltip,
} from "@/components/ui/map";

const MAP = {
  hours: "Sunday – Thursday, 09:00 – 18:00 (GST)",
  lng: 55.3837419,
  lat: 25.1250606,
};

const OFFICE = {
  id: 1,
  lng: MAP.lng,
  lat: MAP.lat,
};

const SUBJECTS = [
  "Company seat contracts",
  "Admin & onboarding",
  "Course catalog",
  "Partnership",
  "General inquiry",
];

export default function ContactPage() {
  const [status, setStatus] = useState<"idle" | "sent">("idle");
  const [contact, setContact] = useState<PublicContact>(CONTACT_DEFAULTS);
  const call = telHref(contact.phone);
  const whatsapp = whatsappHref(contact.whatsapp);
  const mapLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(contact.address || "Dubai Silicon Oasis, Dubai, UAE")}`;

  useEffect(() => {
    let cancelled = false;
    fetchPublicContact().then((next) => {
      if (!cancelled) setContact(next);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const name = String(data.get("name") ?? "").trim();
    const company = String(data.get("company") ?? "").trim();
    const email = String(data.get("email") ?? "").trim();
    const phone = String(data.get("phone") ?? "").trim();
    const subject = String(data.get("subject") ?? "").trim();
    const message = String(data.get("message") ?? "").trim();

    const body = [
      `Name: ${name}`,
      company ? `Company: ${company}` : null,
      `Email: ${email}`,
      phone ? `Phone: ${phone}` : null,
      `Subject: ${subject}`,
      "",
      message,
    ]
      .filter(Boolean)
      .join("\n");

    const to = contact.emails[0] || CONTACT_DEFAULTS.emails[0];
    window.location.href = `mailto:${to}?subject=${encodeURIComponent(
      `[Workiz] ${subject}`,
    )}&body=${encodeURIComponent(body)}`;
    setStatus("sent");
  }

  return (
    <>
      <SiteHeader />
      <Breadcrumb title="Contact" crumb="Contact" />

      <section className="contact_area inner_section workiz-contact">
        <div className="container">
          <div className="row workiz-contact__row">
            <div className="col-lg-6">
              <div className="contact_main_info workiz-contact__info">
                <div className="workiz-contact__intro">
                  <div className="section-sub-title three">
                    <h6>GET IN TOUCH</h6>
                  </div>
                  <div className="section_title">
                    <h1>Talk to Workiz</h1>
                  </div>
                  <div className="section-title-desc">
                    <p>Questions about seats, admins, or courses? We’re in Dubai Silicon Oasis.</p>
                  </div>
                </div>

                {contact.emails.map((email) => (
                  <div className="call-do-action-info" key={email}>
                    <div className="call_info">
                      <p>Email</p>
                      <h3>
                        <a href={`mailto:${email}`}>{email}</a>
                      </h3>
                    </div>
                  </div>
                ))}

                {call ? (
                  <div className="call-do-action-info">
                    <div className="call_info">
                      <p>Phone</p>
                      <h3>
                        <a href={call}>{contact.phone}</a>
                      </h3>
                    </div>
                  </div>
                ) : null}

                {whatsapp ? (
                  <div className="call-do-action-info">
                    <div className="call_info">
                      <p>WhatsApp</p>
                      <h3>
                        <a href={whatsapp} target="_blank" rel="noopener noreferrer">
                          {contact.whatsapp}
                        </a>
                      </h3>
                    </div>
                  </div>
                ) : null}

                {contact.address ? (
                  <div className="call-do-action-info">
                    <div className="call_info">
                      <p>Office</p>
                      <h3>{contact.address}</h3>
                    </div>
                  </div>
                ) : null}

                <div className="call-do-action-info">
                  <div className="call_info">
                    <p>Business hours</p>
                    <h3>{MAP.hours}</h3>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-lg-6">
              <div className="contact-form-box style_two workiz-contact__form">
                <div className="contact-section-title">
                  <h4>CONTACT US</h4>
                  <h1>Send a message</h1>
                </div>

                <form onSubmit={onSubmit}>
                  <div className="row">
                    <div className="col-lg-6 col-md-6">
                      <div className="form-box">
                        <label className="visually-hidden" htmlFor="contact-name">
                          Your name
                        </label>
                        <input id="contact-name" type="text" name="name" placeholder="Your name *" required />
                      </div>
                    </div>
                    <div className="col-lg-6 col-md-6">
                      <div className="form-box">
                        <label className="visually-hidden" htmlFor="contact-company">
                          Company
                        </label>
                        <input id="contact-company" type="text" name="company" placeholder="Company name" />
                      </div>
                    </div>
                    <div className="col-lg-6 col-md-6">
                      <div className="form-box">
                        <label className="visually-hidden" htmlFor="contact-email">
                          Email
                        </label>
                        <input
                          id="contact-email"
                          type="email"
                          name="email"
                          placeholder="Work email *"
                          required
                        />
                      </div>
                    </div>
                    <div className="col-lg-6 col-md-6">
                      <div className="form-box">
                        <label className="visually-hidden" htmlFor="contact-phone">
                          Phone
                        </label>
                        <input id="contact-phone" type="tel" name="phone" placeholder="Phone number" />
                      </div>
                    </div>
                    <div className="col-lg-12">
                      <div className="form-box">
                        <label className="visually-hidden" htmlFor="contact-subject">
                          Subject
                        </label>
                        <select id="contact-subject" name="subject" required defaultValue="">
                          <option value="" disabled>
                            Select subject *
                          </option>
                          {SUBJECTS.map((item) => (
                            <option key={item} value={item}>
                              {item}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="col-lg-12">
                      <div className="form-box message">
                        <label className="visually-hidden" htmlFor="contact-message">
                          Message
                        </label>
                        <textarea
                          id="contact-message"
                          name="message"
                          cols={30}
                          rows={6}
                          placeholder="How can we help?"
                          required
                        />
                      </div>
                    </div>
                    <div className="checkbox">
                      <input type="checkbox" id="contact-terms" name="terms" value="agree" required />
                      <label htmlFor="contact-terms">
                        I agree to the{" "}
                        <Link href="/privacy">Privacy Policy</Link> and{" "}
                        <Link href="/terms">Terms of Service</Link>.
                      </label>
                    </div>
                    <div className="contact-form">
                      <button type="submit">Send message</button>
                    </div>
                    {status === "sent" ? (
                      <p className="workiz-contact__status" role="status">
                        Opening your email app to send the message to {contact.emails[0] || "the team"}.
                      </p>
                    ) : null}
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="workiz-contact__map">
        <div className="container">
          <div className="workiz-contact__map-panel">
            <div className="workiz-contact__map-head">
              <div>
                <h2>Find us in Dubai Silicon Oasis</h2>
                <p>
                  {contact.address || "Dubai Silicon Oasis, Dubai"}
                </p>
              </div>
              <a
                className="workiz-contact__map-link"
                href={mapLink}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open in Google Maps
              </a>
            </div>
            <div className="workiz-contact__map-frame">
              <Map center={[OFFICE.lng, OFFICE.lat]} zoom={13} theme="light">
                <MapMarker longitude={OFFICE.lng} latitude={OFFICE.lat}>
                  <MarkerContent>
                    <div className="bg-primary size-4 rounded-full border-2 border-white shadow-lg" />
                  </MarkerContent>
                  <MarkerTooltip>{contact.address || "Workiz"}</MarkerTooltip>
                  <MarkerPopup>
                    <div className="space-y-1">
                      <p className="text-foreground font-medium">Workiz</p>
                      <p className="text-muted-foreground text-xs">{contact.address}</p>
                    </div>
                  </MarkerPopup>
                </MapMarker>
              </Map>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </>
  );
}
