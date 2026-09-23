import { LegalPage } from "@/components/LegalPage";

export default function PrivacyPolicyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      crumb="Privacy Policy"
      intro="Workiz values the privacy of its learners, company administrators, and website visitors. This Privacy Policy explains how we handle information collected through our website, learning platform, and related services."
      sections={[
        {
          heading: "Information We Collect",
          body: [
            "We may collect information you provide when creating an account, joining a company training program, or contacting our team. This may include your name, email address, company details, and account information.",
            "We may also collect learning activity, course progress, and technical information needed to operate and maintain the platform.",
          ],
        },
        {
          heading: "How We Use Information",
          body: "The information we collect helps us to:",
          bullets: [
            "Create and manage user accounts.",
            "Provide access to courses and assigned training.",
            "Support company administrators with employee learning.",
            "Process company seat arrangements and related services.",
            "Monitor platform performance and improve user experience.",
            "Respond to enquiries and provide account support.",
            "Meet applicable legal and security requirements.",
          ],
        },
        {
          heading: "Sharing Information",
          body: [
            "Workiz does not sell personal information.",
            "We may share relevant information with service providers that support platform operations, such as hosting, payment processing, and email services. Where learning is provided through a company account, authorised company administrators may access relevant employee account and learning information.",
            "We may also disclose information when required by law or when necessary to protect the security and rights of our users and platform.",
          ],
        },
        {
          heading: "Data Retention & Security",
          body: [
            "We retain personal information for as long as it is needed to provide our services, fulfil legitimate business requirements, or meet applicable legal obligations.",
            "We use reasonable administrative and technical measures to help protect personal and learning information from unauthorised access, misuse, or disclosure. However, no online system can guarantee complete security.",
          ],
        },
        {
          heading: "Your Choices",
          body: [
            "Depending on applicable law, you may have the right to request access to, correction of, or deletion of your personal information.",
            "You can also update certain account details through your profile settings. For privacy-related requests or questions, please contact our team.",
          ],
        },
      ]}
      contact={{
        email: "hello@workiz.com",
        phone: "+971 4 320 8888",
        address: "Workiz Support Solutions - FZCO, Dubai Silicon Oasis, Dubai, United Arab Emirates",
      }}
      contactIntro="For questions about this Privacy Policy or how your information is handled, contact us at:"
      contactHeading="Contact Us"
    />
  );
}
