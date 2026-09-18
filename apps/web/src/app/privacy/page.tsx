import { LegalPage } from "@/components/LegalPage";

export default function PrivacyPolicyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      crumb="Privacy Policy"
      intro="This Privacy Policy explains how WORKIZ collects, uses, and protects personal information when you use our learning platform, websites, and related services."
      sections={[
        {
          heading: "Information we collect",
          body: "We may collect account details (such as name, email, department, and company), learning activity (course progress, quiz results, certificates), billing information for company seat contracts, and technical data such as device, browser, and usage logs needed to operate and secure the platform.",
        },
        {
          heading: "How we use information",
          body: "We use personal information to deliver assigned courses, support company admin account management, process seat contracts, issue certificates, improve product performance, communicate service updates, and meet legal or compliance obligations.",
        },
        {
          heading: "Sharing",
          body: "We do not sell personal data. We may share information with trusted processors (for example payment, hosting, and email providers) under contract, with your company administrators when you learn under a company seat, or when required by law.",
        },
        {
          heading: "Data retention & security",
          body: "We retain information only as long as needed for the purposes described above or as required by law. We apply administrative and technical safeguards designed to protect account and learning data against unauthorized access.",
        },
        {
          heading: "Your choices",
          body: "You may request access, correction, or deletion of personal data where applicable by contacting hello@workiz.com. You can also update profile details from your account settings when signed in.",
        },
      ]}
    />
  );
}
