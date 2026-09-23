import { LegalPage } from "@/components/LegalPage";

export default function CookiePolicyPage() {
  return (
    <LegalPage
      title="Cookie Policy"
      crumb="Cookie Policy"
      intro="This Cookie Policy explains how Workiz may use cookies and similar technologies on its website, learning platform, and related services. Cookies help us operate our platform, understand how visitors use our website, and improve the overall learning and browsing experience. This policy explains what cookies are, how they may be used, and the choices available to you."
      sections={[
        {
          heading: "What Are Cookies?",
          body: [
            "Cookies are small text files stored on your device when you visit a website. They allow websites to remember certain information, support essential functions, and understand how users interact with different pages and features.",
            "Depending on the platform configuration, Workiz may use cookies and similar technologies for purposes such as:",
          ],
          bullets: [
            "Keeping the website and learning platform functional.",
            "Remembering selected preferences and settings.",
            "Supporting account and session management.",
            "Understanding website usage and performance.",
            "Improving website functionality and user experience.",
          ],
        },
        {
          heading: "Cookies We Use",
          body: [
            "Not all cookies serve the same purpose. Some may be necessary for the platform to operate, while others may support analytics or optional features.",
            "Workiz may use different categories of cookies depending on the features and technologies implemented on the website and learning platform.",
          ],
          subsections: [
            {
              heading: "Essential Cookies",
              body: "These cookies may be required to support core website and platform functions, including secure sessions, account access, and navigation. Disabling essential cookies may affect the availability or functionality of certain services.",
            },
            {
              heading: "Preference Cookies",
              body: "These cookies may help remember choices or settings, allowing the website to provide a more convenient experience during future visits.",
            },
            {
              heading: "Analytics Cookies",
              body: "Where enabled, analytics cookies may help us understand how visitors use the website, which pages receive engagement, and where improvements may be needed.",
            },
            {
              heading: "Third-Party Cookies",
              body: "Some services integrated into the website or learning platform may place their own cookies or similar technologies. These services may include hosting, analytics, payment, communication, or other platform-support tools, depending on the final website configuration.",
            },
          ],
          note: "Client Review Note: The final cookie categories, providers, cookie names, purposes, and retention periods should be confirmed based on the actual technologies implemented on the website.",
        },
        {
          heading: "Managing Cookies",
          body: [
            "You can manage or restrict cookies through your browser settings. Most browsers allow you to view, block, delete, or control cookies according to your preferences.",
            "Please note that restricting or disabling certain cookies may affect website functionality, account access, or the performance of some platform features.",
            "Where applicable, Workiz may provide additional cookie preference controls to help visitors manage optional cookies.",
            "For guidance on managing cookies, you can review the settings and support information provided by your browser.",
          ],
        },
        {
          heading: "Updates to This Policy",
          body: [
            "We may update this Cookie Policy when our website, learning platform, services, or cookie practices change.",
            "Any updates will be published on this page with a revised effective date where appropriate. We encourage visitors to review this policy periodically to stay informed about how cookies and similar technologies may be used.",
          ],
        },
      ]}
      contact={{
        email: "hello@workiz.com",
        phone: "+971 4 320 8888",
        address: "Workiz Support Solutions - FZCO, Dubai Silicon Oasis, Dubai, United Arab Emirates",
      }}
      contactHeading="Contact / Questions"
      contactIntro="If you have questions about this Cookie Policy or how Workiz uses cookies and similar technologies, you can contact our team using the details below."
      contactNote="Our team can help address general questions about website privacy, cookies, and platform usage."
    />
  );
}
