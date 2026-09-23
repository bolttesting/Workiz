import { LegalPage } from "@/components/LegalPage";

export default function TermsOfServicePage() {
  return (
    <LegalPage
      title="Terms of Service"
      crumb="Terms of Service"
      intro="These Terms of Service explain the conditions for using the Workiz website, learning platform, and related services. By accessing or using our platform, you agree to follow these terms."
      sections={[
        {
          heading: "Accounts & Eligibility",
          body: [
            "Some Workiz features may require you to create an account. You are responsible for providing accurate information and keeping your login details secure.",
            "If your account is managed through an organization, your access and course assignments may be controlled by the authorized company administrator.",
            "Please contact our team if you notice unauthorized activity or need help with your account.",
          ],
        },
        {
          heading: "Courses & Licenses",
          body: [
            "Workiz provides access to online training programs and learning materials for personal and professional development.",
            "Course availability, content, access periods, and applicable conditions may vary between programs or company arrangements. Users should access course materials only for their intended learning purposes and should not copy, distribute, or share protected content without appropriate permission.",
            "Workiz may update course content, introduce new programs, or make changes to available learning materials.",
          ],
        },
        {
          heading: "Acceptable Use",
          body: "When using the Workiz platform, you agree to:",
          bullets: [
            "Provide accurate account information.",
            "Keep your login credentials confidential.",
            "Use the platform for lawful purposes.",
            "Respect the rights of other users and content owners.",
            "Avoid disrupting platform operations or attempting unauthorized access.",
            "Not reproduce, distribute, or misuse platform content.",
          ],
        },
        {
          heading: "Payments & Refunds",
          body: [
            "Certain training programs or company services may involve fees. Applicable prices, payment conditions, and service details will be communicated during the relevant purchase or company arrangement process.",
            "Any refunds, cancellations, or changes to paid services will be handled according to the applicable purchase terms or agreement.",
            "For questions about payments or refunds, please contact our team.",
          ],
        },
        {
          heading: "Limitation of Liability",
          body: [
            "Workiz aims to provide reliable learning services and maintain a functional platform. However, we cannot guarantee that the website, platform, or every course will always be available without interruptions or errors.",
            "To the extent permitted by applicable law, Workiz will not be responsible for losses arising from unauthorized use, service interruptions, or reliance on learning materials beyond their intended purpose.",
            "Nothing in these terms limits any rights or responsibilities that cannot legally be excluded.",
          ],
        },
      ]}
      contact={{
        email: "hello@workiz.com",
        phone: "+971 4 320 8888",
        address: "Workiz Support Solutions - FZCO, Dubai Silicon Oasis, Dubai, United Arab Emirates",
      }}
      contactIntro="If you have questions about these Terms of Service, please contact us:"
      contactHeading="Contact / Questions"
    />
  );
}
