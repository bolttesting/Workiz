"use client";

import { useEffect, useState } from "react";
import { LearnShell } from "@/components/LearnShell";
import { EmptyState, LearnDataCard, LearnPageHeader, LoadingState, StatusBadge } from "@/components/LearnUi";
import { apiClient, downloadFile } from "@/lib/api";
import { formatMoney } from "@workix/config";
import type { Profile } from "@workix/db/types";

type Invoice = { id: string; number: string; amount_cents: number; currency: string; pdf_key: string | null; issued_at?: string };

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [role, setRole] = useState<Profile["role"] | null>(null);
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));

  useEffect(() => {
    setLoading(true);
    Promise.all([
      apiClient<{ invoices: Invoice[] }>("/me/invoices"),
      apiClient<{ profile: Profile }>("/me"),
    ])
      .then(([r, me]) => {
        setInvoices(r.invoices);
        setRole(me.profile.role);
        setError(null);
      })
      .catch((err) => setError((err as Error).message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <LearnShell>
      <LearnPageHeader title="Invoices" description="Receipts for courses you purchased." />
      {error ? (
        <div className="alert alert-danger radius-8 mb-24" role="alert">
          {error}
        </div>
      ) : null}
      <LearnDataCard
        title="Your invoices"
        toolbar={
          role === "company_admin" ? (
            <div className="d-flex flex-wrap gap-2 align-items-center">
              <input className="form-control form-control-sm radius-8" type="month" value={month} onChange={(e) => setMonth(e.target.value)} aria-label="Invoice month" />
              <button
                type="button"
                className="btn btn-outline-primary-600 btn-sm radius-8"
                onClick={() => {
                  const rows = invoices.filter((invoice) => (invoice.issued_at ?? "").startsWith(month));
                  const lines = [["Number", "Issued", "Amount"].join(",")];
                  for (const invoice of rows) {
                    const amount = formatMoney(invoice.amount_cents, "aed").replace(/"/g, "\"\"");
                    lines.push([invoice.number, (invoice.issued_at ?? "").slice(0, 10), `"${amount}"`].join(","));
                  }
                  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `invoices-${month}.csv`;
                  document.body.appendChild(a);
                  a.click();
                  a.remove();
                  URL.revokeObjectURL(url);
                }}
              >
                Download month
              </button>
            </div>
          ) : null
        }
      >
        {loading ? <LoadingState /> : null}
        {!loading ? (
          <div className="workiz-admin-table-wrap">
            <table className="table bordered-table mb-0">
              <thead>
                <tr>
                  <th>Number</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td className="fw-medium text-primary-light">{invoice.number}</td>
                    <td className="dirham-sign">{formatMoney(invoice.amount_cents, "aed")}</td>
                    <td>
                      <StatusBadge label="Paid" tone="success" />
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-outline-primary-600 btn-sm radius-8"
                        disabled={downloading === invoice.id}
                        onClick={() => {
                          setDownloading(invoice.id);
                          setError(null);
                          downloadFile(`/me/invoices/${invoice.id}/pdf`, `${invoice.number}.pdf`)
                            .catch((err) => setError((err as Error).message))
                            .finally(() => setDownloading(null));
                        }}
                      >
                        {downloading === invoice.id ? "Preparing…" : "Download"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {invoices.length === 0 ? <EmptyState message="Purchases show up here after checkout." /> : null}
          </div>
        ) : null}
      </LearnDataCard>
    </LearnShell>
  );
}
