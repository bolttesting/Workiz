import { SiteFooter, SiteHeader, Breadcrumb } from "@/components/SiteChrome";

type LegalSection = {
  heading: string;
  body: string;
};

export function LegalPage({
  title,
  crumb,
  intro,
  sections,
}: {
  title: string;
  crumb: string;
  intro: string;
  sections: LegalSection[];
}) {
  return (
    <>
      <SiteHeader />
      <Breadcrumb title={title} crumb={crumb} />
      <section className="course-sign-form-area">
        <div className="container" style={{ maxWidth: 860, paddingBottom: 80 }}>
          <p style={{ color: "#3f4a57", fontSize: 16, lineHeight: 1.7, marginBottom: 32 }}>{intro}</p>
          {sections.map((section) => (
            <div key={section.heading} style={{ marginBottom: 28 }}>
              <h3 style={{ color: "#102846", fontSize: 22, marginBottom: 10 }}>{section.heading}</h3>
              <p style={{ color: "#3f4a57", fontSize: 15, lineHeight: 1.75, margin: 0 }}>{section.body}</p>
            </div>
          ))}
          <p style={{ color: "#3f4a57", fontSize: 14, marginTop: 40 }}>
            Questions? Contact us at <a href="mailto:hello@workiz.com">hello@workiz.com</a>.
          </p>
        </div>
      </section>
      <SiteFooter />
    </>
  );
}
