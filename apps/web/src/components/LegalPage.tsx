import Link from "next/link";
import { SiteFooter, SiteHeader, Breadcrumb } from "@/components/SiteChrome";

export type LegalSubsection = {
  heading: string;
  body?: string | string[];
  bullets?: string[];
};

export type LegalSection = {
  heading: string;
  body?: string | string[];
  bullets?: string[];
  subsections?: LegalSubsection[];
  note?: string;
};

const LEGAL_NAV = [
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms of Service" },
  { href: "/cookies", label: "Cookie Policy" },
];

function Paragraphs({
  id,
  body,
}: {
  id: string;
  body?: string | string[];
}) {
  if (!body) return null;
  const paragraphs = Array.isArray(body) ? body : [body];
  return (
    <>
      {paragraphs.map((paragraph, index) => (
        <p key={`${id}-${index}`}>{paragraph}</p>
      ))}
    </>
  );
}

function Bullets({ items }: { items?: string[] }) {
  if (!items?.length) return null;
  return (
    <ul>
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

export function LegalPage({
  title,
  crumb,
  intro,
  sections,
  contact,
  contactIntro,
  contactHeading = "Contact Us",
  contactNote,
}: {
  title: string;
  crumb: string;
  intro: string;
  sections: LegalSection[];
  contact?: {
    email?: string;
    phone?: string;
    address?: string;
  };
  contactIntro?: string;
  contactHeading?: string;
  contactNote?: string;
}) {
  return (
    <>
      <SiteHeader />
      <Breadcrumb title={title} crumb={crumb} />
      <section className="workiz-legal">
        <div className="container workiz-legal__shell">
          <aside className="workiz-legal__nav" aria-label="Legal policies">
            <p className="workiz-legal__nav-label">Legal</p>
            <ul>
              {LEGAL_NAV.map((item) => {
                const active = item.label === title || item.label === crumb;
                return (
                  <li key={item.href}>
                    <Link href={item.href} className={active ? "is-active" : undefined} aria-current={active ? "page" : undefined}>
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </aside>

          <div className="workiz-legal__content">
            <header className="workiz-legal__head">
              <p className="workiz-legal__eyebrow">Workiz Legal</p>
              <h1 className="workiz-legal__title">{title}</h1>
              <p className="workiz-legal__intro">{intro}</p>
            </header>

            <div className="workiz-legal__sections">
              {sections.map((section, sectionIndex) => (
                <section key={section.heading} className="workiz-legal__section">
                  <div className="workiz-legal__section-index">{String(sectionIndex + 1).padStart(2, "0")}</div>
                  <div className="workiz-legal__section-body">
                    <h2>{section.heading}</h2>
                    <Paragraphs id={section.heading} body={section.body} />
                    <Bullets items={section.bullets} />
                    {section.subsections?.map((sub) => (
                      <div key={sub.heading} className="workiz-legal__subsection">
                        <h3>{sub.heading}</h3>
                        <Paragraphs id={`${section.heading}-${sub.heading}`} body={sub.body} />
                        <Bullets items={sub.bullets} />
                      </div>
                    ))}
                    {section.note ? <p className="workiz-legal__note">{section.note}</p> : null}
                  </div>
                </section>
              ))}
            </div>

            {contact ? (
              <div className="workiz-legal__contact">
                <div className="workiz-legal__contact-copy">
                  <h2>{contactHeading}</h2>
                  <p>
                    {contactIntro ||
                      `If you have questions about this ${title}, please contact us:`}
                  </p>
                  {contactNote ? <p className="workiz-legal__contact-note">{contactNote}</p> : null}
                </div>
                <ul className="workiz-legal__contact-list">
                  {contact.email ? (
                    <li>
                      <span>Email</span>
                      <a href={`mailto:${contact.email}`}>{contact.email}</a>
                    </li>
                  ) : null}
                  {contact.phone ? (
                    <li>
                      <span>Phone</span>
                      <a href={`tel:${contact.phone.replace(/[^\d+]/g, "")}`}>{contact.phone}</a>
                    </li>
                  ) : null}
                  {contact.address ? (
                    <li>
                      <span>Address</span>
                      <strong>{contact.address}</strong>
                    </li>
                  ) : null}
                </ul>
              </div>
            ) : (
              <p className="workiz-legal__footer-note">
                Questions? Contact us at <a href="mailto:hello@workiz.com">hello@workiz.com</a>.
              </p>
            )}
          </div>
        </div>
      </section>
      <SiteFooter />
    </>
  );
}
