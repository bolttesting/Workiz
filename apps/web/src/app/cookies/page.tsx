import { LegalPage } from "@/components/LegalPage";

export default function CookiePolicyPage() {
  return (
    <LegalPage
      title="Cookie Policy"
      crumb="Cookie Policy"
      intro="This Cookie Policy describes how WORKIZ uses cookies and similar technologies on our websites and learning platform."
      sections={[
        {
          heading: "What are cookies?",
          body: "Cookies are small text files stored on your device. They help the site remember preferences, keep you signed in, and understand how the platform is used so we can improve reliability and experience.",
        },
        {
          heading: "Cookies we use",
          body: "Essential cookies support authentication, security, and core LMS features. Preference cookies remember settings such as language or UI choices. Analytics cookies help us understand feature usage in aggregate so we can improve Workiz.",
        },
        {
          heading: "Managing cookies",
          body: "You can control cookies through your browser settings. Disabling essential cookies may prevent sign-in or other core features from working correctly. Where required, we will request consent before setting non-essential cookies.",
        },
        {
          heading: "Updates",
          body: "We may update this Cookie Policy when our practices change. Continued use of Workiz after updates means you acknowledge the revised policy.",
        },
      ]}
    />
  );
}
