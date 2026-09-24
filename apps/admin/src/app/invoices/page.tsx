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
import { apiClient } from "@/lib/api";
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
                  <th>PDF</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((inv) => (
                  <tr key={inv.id}>
                    <td className="fw-medium text-primary-light">{inv.number}</td>
                    <td>{inv.issued_at?.slice(0, 10) || "—"}</td>
                    <td>{formatMoney(inv.amount_cents, inv.currency)}</td>
                    <td>
                      <StatusBadge
                        label={inv.pdf_key ? "Ready" : "Pending"}
                        tone={inv.pdf_key ? "success" : "warning"}
                      />
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
