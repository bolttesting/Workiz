import { AdminShell } from "@/components/AdminShell";
import { AdminPageHeader } from "@/components/AdminUi";

const groups = [
  {
    title: "Auth & apps",
    items: [
      "NEXT_PUBLIC_WEB_URL / LEARN_URL / ADMIN_URL / API_URL",
      "NEXT_PUBLIC_SUPABASE_URL + ANON_KEY",
      "SUPABASE_SERVICE_ROLE_KEY",
      "NEXT_PUBLIC_COOKIE_DOMAIN (production)",
    ],
  },
  {
    title: "Media",
    items: [
      "MEDIA_UPLOAD_URL + MEDIA_UPLOAD_SECRET (Hostinger upload.php)",
      "MEDIA_PUBLIC_BASE_URL (e.g. https://test.hub71.site/media)",
      "S3_* optional later for CDN / HLS when the business scales",
    ],
  },
  {
    title: "Commerce & email",
    items: [
      "STRIPE_SECRET_KEY + webhook secret",
      "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
      "Seat price IDs for company plans",
      "RESEND_API_KEY + from-address",
    ],
  },
];

export default function SettingsPage() {
  return (
    <AdminShell>
      <AdminPageHeader
        title="Settings"
        description="Platform configuration lives in environment variables for v1 — not editable in the database."
      />
      <div className="row gy-4">
        {groups.map((group) => (
          <div className="col-xl-4" key={group.title}>
            <div className="card radius-12 shadow-1 h-100">
              <div className="card-header border-bottom bg-base py-16 px-24">
                <h6 className="mb-0 fw-semibold">{group.title}</h6>
              </div>
              <div className="card-body">
                <ul className="mb-0 ps-16">
                  {group.items.map((item) => (
                    <li key={item} className="mb-8 text-secondary-light">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ))}
        <div className="col-12">
          <div className="card radius-12 shadow-1">
            <div className="card-body">
              <h6 className="fw-semibold">Super admin checklist</h6>
              <ol className="mb-0">
                <li>Create courses with thumbnail, department, duration, and price.</li>
                <li>Build modules/lessons (video upload, article rich text, quiz).</li>
                <li>Publish courses to the marketing catalog.</li>
                <li>Promote instructors and assign them to courses.</li>
                <li>Publish blog posts with SEO title/description/keywords.</li>
                <li>Review companies, seats, orders, and invoices.</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
