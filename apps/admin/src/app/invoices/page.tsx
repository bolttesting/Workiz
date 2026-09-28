"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminShell } from "@/components/AdminShell";
import {
  AdminDataCard,
  AdminPageHeader,
  AdminSearchInput,
  EmptyState,
  LoadingState,
  StatusBadge,
  matchesQuery,
} from "@/components/AdminUi";
import { apiClient, downloadFile } from "@/lib/api";
import { formatMoney } from "@workix/config";

type Invoice = {
  id: string;
  number: string;
  amount_cents: number;
  currency: string;
  pdf_key: string | null;
  issued_at?: string | null;
};

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    apiClient<{ invoices: Invoice[] }>("/admin/invoices")
      .then((r) => {
        setInvoices(r.invoices);
        setError(null);
      })
      .catch((err) => setError((err as Error).message))
      .finally(() => setLoading(false));
  }, []);

  async function download(inv: Invoice) {
    setDownloading(inv.id);
    setError(null);
    try {
      await downloadFile(`/admin/invoices/${inv.id}/pdf`, `${inv.number}.pdf`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setDownloading(null);
    }
  }

  const filtered = useMemo(
    () => invoices.filter((inv) => matchesQuery(query, [inv.number, inv.pdf_key, inv.id])),
    [invoices, query],
  );

  return (
    <AdminShell>
      <AdminPageHeader title="Invoices" description="Generated invoice records for paid orders." />
      {error ? (
        <div className="alert alert-danger radius-8 mb-24" role="alert">
          {error}
        </div>
      ) : null}

      <AdminDataCard
        title="All invoices"
        toolbar={<AdminSearchInput value={query} onChange={setQuery} placeholder="Search invoices…" />}
      >
        {loading ? <LoadingState /> : null}
        {!loading ? (
          <div className="workiz-admin-table-wrap">
            <table className="table bordered-table mb-0">
              <thead>
                <tr>
                  <th>Number</th>
                  <th>Issued</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((inv) => (
                  <tr key={inv.id}>
                    <td className="fw-medium text-primary-light">{inv.number}</td>
                    <td>{inv.issued_at?.slice(0, 10) || "—"}</td>
                    <td className="dirham-sign">{formatMoney(inv.amount_cents, "aed")}</td>
                    <td>
                      <StatusBadge label="Paid" tone="success" />
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-outline-primary-600 btn-sm radius-8"
                        disabled={downloading === inv.id}
                        onClick={() => void download(inv)}
                      >
                        {downloading === inv.id ? "Preparing…" : "Download"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 ? <EmptyState message="No invoices match your search." /> : null}
          </div>
        ) : null}
      </AdminDataCard>
    </AdminShell>
  );
}
