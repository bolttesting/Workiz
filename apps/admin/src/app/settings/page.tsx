import { AdminShell } from "@/components/AdminShell";

export default function SettingsPage() {
  return (
    <AdminShell>
      <h6 className="mb-24">Settings</h6>
      <div className="card radius-12">
        <div className="card-body">
          <p>Configure these in `.env` on the VPS — they are not stored in the database for v1.</p>
          <ul>
            <li>Supabase URL and keys</li>
            <li>S3/R2 bucket + CDN</li>
            <li>Stripe secret, webhook secret, seat price ID</li>
            <li>Resend API key and from-address</li>
            <li>Cookie domain `.workix.com` in production</li>
          </ul>
        </div>
      </div>
    </AdminShell>
  );
}
