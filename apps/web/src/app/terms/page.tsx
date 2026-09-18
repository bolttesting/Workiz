import { LegalPage } from "@/components/LegalPage";

export default function TermsOfServicePage() {
  return (
    <LegalPage
      title="Terms of Service"
      crumb="Terms of Service"
      intro="These Terms of Service govern access to and use of the WORKIZ platform for organizations contracting seat licenses and the employees who learn under those seats."
      sections={[
        {
          heading: "Accounts & eligibility",
          body: "You must provide accurate registration information and keep credentials confidential. Company administrators create learner accounts, assign courses, and are responsible for seat usage under their organization.",
        },
        {
          heading: "Courses & licenses",
          body: "Companies contract seat licenses for their workforce. Company administrators assign published courses to employees according to department, role, or training plan. Course content remains owned by WORKIZ or its licensors.",
        },
        {
          heading: "Acceptable use",
          body: "You agree not to misuse the platform, share account access unlawfully, copy or redistribute course materials outside permitted company learning use, attempt unauthorized access, or interfere with platform operations.",
        },
        {
          heading: "Payments & refunds",
          body: "Fees are charged as displayed at checkout or in your company agreement. Unless a specific refund policy is stated in the contract or required by law, fees are non-refundable after access is granted.",
        },
        {
          heading: "Limitation of liability",
          body: "WORKIZ provides the platform on an as-available basis. To the fullest extent permitted by law, WORKIZ is not liable for indirect or consequential damages arising from use of the service. Our total liability is limited to fees paid for the service in the twelve months before the claim.",
        },
      ]}
    />
  );
}
