"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AdminShell } from "@/components/AdminShell";
import { AdminPageHeader, LoadingState } from "@/components/AdminUi";
import { apiClient } from "@/lib/api";

type Settings = {
  quizPassMark: number;
  dueSoonDays: number;
  inviteDays: number;
  certificateIssuer: string;
  whatsapp: string;
  phone: string;
  emails: string[];
  address: string;
};

const related = [
  { href: "/packages", label: "Packages", detail: "Growth and Custom seat prices, in Dirhams" },
  { href: "/organizations", label: "Companies", detail: "Seats, billing period, people who have not started" },
  { href: "/questions", label: "Questions", detail: "Unanswered course questions" },
  { href: "/invoices", label: "Invoices", detail: "Paid receipts and downloads" },
  { href: "/orders", label: "Orders", detail: "Course and seat checkouts" },
];

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [emailConfigured, setEmailConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const web = process.env.NEXT_PUBLIC_WEB_URL ?? "http://localhost:3000";

  useEffect(() => {
    apiClient<{ settings: Settings; emailConfigured: boolean }>("/admin/settings")
      .then((res) => {
        setSettings({
          ...res.settings,
          whatsapp: res.settings.whatsapp ?? "",
          phone: res.settings.phone ?? "",
          emails: res.settings.emails?.length ? res.settings.emails : [""],
          address: res.settings.address ?? "",
        });
        setEmailConfigured(res.emailConfigured);
        setError(null);
      })
      .catch((err) => setError((err as Error).message))
      .finally(() => setLoading(false));
  }, []);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!settings) return;
    const emails = settings.emails.map((email) => email.trim()).filter(Boolean);
    if (emails.some((email) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
      setError("Enter a valid email, or remove the empty row.");
      setOk(null);
      return;
    }
    setSaving(true);
    setError(null);
    setOk(null);
    try {
      const res = await apiClient<{ settings: Settings }>("/admin/settings", {
        method: "PATCH",
        body: JSON.stringify({ ...settings, emails }),
      });
      setSettings(res.settings);
      setOk("Settings saved. The website contact details update on the next visit.");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminShell>
      <AdminPageHeader
        title="Settings"
        description="Learning rules, and the WhatsApp number, call number, emails, and address shown on the website."
      />
      {error ? (
        <div className="alert alert-danger radius-8 mb-24" role="alert">
          {error}
        </div>
      ) : null}
      {ok ? (
        <div className="alert alert-success radius-8 mb-24" role="status">
          {ok}
        </div>
      ) : null}
      {loading ? <LoadingState /> : null}
      {!loading && settings ? (
        <div className="row gy-4">
          <div className="col-xl-7">
            <form className="card radius-12 shadow-1" onSubmit={save}>
              <div className="card-header border-bottom bg-base py-16 px-24">
                <h6 className="mb-0 fw-semibold">Learning rules</h6>
              </div>
              <div className="card-body d-flex flex-column gap-3">
                <div>
                  <label className="form-label" htmlFor="quiz-pass">
                    Default quiz pass mark (%)
                  </label>
                  <input
                    id="quiz-pass"
                    className="form-control radius-8"
                    type="number"
                    min={1}
                    max={100}
                    value={settings.quizPassMark}
                    onChange={(e) => setSettings({ ...settings, quizPassMark: Number(e.target.value) })}
                  />
                  <p className="text-sm text-secondary-light mb-0 mt-8">New lecture quizzes start at this mark. An existing quiz keeps its own mark.</p>
                </div>
                <div>
                  <label className="form-label" htmlFor="due-soon">
                    Due soon (days)
                  </label>
                  <input
                    id="due-soon"
                    className="form-control radius-8"
                    type="number"
                    min={1}
                    max={60}
                    value={settings.dueSoonDays}
                    onChange={(e) => setSettings({ ...settings, dueSoonDays: Number(e.target.value) })}
                  />
                  <p className="text-sm text-secondary-light mb-0 mt-8">Team progress marks a course Due soon when the date is inside this window.</p>
                </div>
                <div>
                  <label className="form-label" htmlFor="invite-days">
                    Invite link lasts (days)
                  </label>
                  <input
                    id="invite-days"
                    className="form-control radius-8"
                    type="number"
                    min={1}
                    max={30}
                    value={settings.inviteDays}
                    onChange={(e) => setSettings({ ...settings, inviteDays: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="form-label" htmlFor="issuer">
                    Certificate issuer
                  </label>
                  <input
                    id="issuer"
                    className="form-control radius-8"
                    value={settings.certificateIssuer}
                    maxLength={80}
                    onChange={(e) => setSettings({ ...settings, certificateIssuer: e.target.value })}
                    required
                  />
                  <p className="text-sm text-secondary-light mb-0 mt-8">Printed at the top of the certificate. The learner’s company name is printed under their name.</p>
                </div>
                <div className="border-top pt-16 mt-8">
                  <h6 className="mb-8 fw-semibold">Contact details</h6>
                  <p className="text-sm text-secondary-light mb-16">Shown on the website contact page, the help button, and the legal pages. Leave a number blank to hide that button.</p>
                </div>
                <div>
                  <label className="form-label" htmlFor="whatsapp">
                    WhatsApp number
                  </label>
                  <input
                    id="whatsapp"
                    className="form-control radius-8"
                    type="tel"
                    value={settings.whatsapp}
                    maxLength={40}
                    placeholder="+971 4 320 8888"
                    onChange={(e) => setSettings({ ...settings, whatsapp: e.target.value })}
                  />
                </div>
                <div>
                  <label className="form-label" htmlFor="call-number">
                    Call number
                  </label>
                  <input
                    id="call-number"
                    className="form-control radius-8"
                    type="tel"
                    value={settings.phone}
                    maxLength={40}
                    placeholder="+971 4 320 8888"
                    onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                  />
                </div>
                <div>
                  <span className="form-label">Emails</span>
                  <div className="d-flex flex-column gap-2">
                    {settings.emails.map((email, index) => (
                      <div key={index} className="d-flex gap-2">
                        <input
                          className="form-control radius-8"
                          type="email"
                          value={email}
                          maxLength={120}
                          aria-label={`Email ${index + 1}`}
                          onChange={(e) => {
                            const emails = [...settings.emails];
                            emails[index] = e.target.value;
                            setSettings({ ...settings, emails });
                          }}
                        />
                        <button
                          type="button"
                          className="btn btn-outline-danger-600 radius-8"
                          onClick={() => setSettings({ ...settings, emails: settings.emails.filter((_, i) => i !== index) })}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      className="btn btn-outline-primary-600 radius-8 align-self-start"
                      disabled={settings.emails.length >= 8}
                      onClick={() => setSettings({ ...settings, emails: [...settings.emails, ""] })}
                    >
                      Add email
                    </button>
                  </div>
                </div>
                <div>
                  <label className="form-label" htmlFor="address">
                    Address
                  </label>
                  <textarea
                    id="address"
                    className="form-control radius-8"
                    rows={3}
                    maxLength={300}
                    value={settings.address}
                    onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                  />
                </div>
                <button className="btn btn-primary-600 radius-8 align-self-start" type="submit" disabled={saving}>
                  {saving ? "Saving…" : "Save settings"}
                </button>
              </div>
            </form>
          </div>
          <div className="col-xl-5">
            <div className="card radius-12 shadow-1 h-100">
              <div className="card-header border-bottom bg-base py-16 px-24">
                <h6 className="mb-0 fw-semibold">Related</h6>
              </div>
              <div className="card-body d-flex flex-column gap-3">
                {related.map((item) => (
                  <div key={item.href} className="d-flex flex-wrap justify-content-between align-items-center gap-2">
                    <div>
                      <div className="fw-medium text-primary-light">{item.label}</div>
                      <div className="text-sm text-secondary-light">{item.detail}</div>
                    </div>
                    <Link href={item.href} className="btn btn-outline-primary-600 btn-sm radius-8">
                      Open
                    </Link>
                  </div>
                ))}
                <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
                  <div>
                    <div className="fw-medium text-primary-light">Certificate check</div>
                    <div className="text-sm text-secondary-light">Public page for a certificate number</div>
                  </div>
                  <a href={`${web}/verify`} className="btn btn-outline-primary-600 btn-sm radius-8" target="_blank" rel="noreferrer">
                    Open
                  </a>
                </div>
                <p className="text-sm text-secondary-light mb-0">
                  Prices stay in Dirhams. Invite email is {emailConfigured ? "on" : "off until a Resend key is set"}.
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </AdminShell>
  );
}
