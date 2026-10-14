"use client";

import { useState } from "react";
import { AdminShell } from "@/components/AdminShell";
import {
  AdminDataCard,
  AdminPageHeader,
  AdminSearchInput,
  EmptyState,
  LoadingState,
  Pagination,
  StatusBadge,
  formatDate,
} from "@/components/AdminUi";
import { downloadFile } from "@/lib/api";
import { useServerList } from "@/lib/useServerList";
import { formatMoney } from "@workix/config";

type Invoice = {
  id: string;
  number: string;
  amount_cents: number;
  currency: string;
  pdf_key: string | null;
  issued_at?: string | null;
  order?: {
    kind: string;
    user?: { full_name: string | null; email: string } | null;
    organization?: { name: string } | null;
  } | null;
};

export default function InvoicesPage() {
  const list = useServerList<Invoice>({ path: "/admin/invoices", key: "invoices" });
  const [downloading, setDownloading] = useState<string | null>(null);

  async function download(inv: Invoice) {
    setDownloading(inv.id);
    list.setError(null);
    try {
      await downloadFile(`/admin/invoices/${inv.id}/pdf`, `${inv.number}.pdf`);
    } catch (err) {
      list.setError((err as Error).message);
    } finally {
      setDownloading(null);
    }
  }

  return (
    <AdminShell>
      <AdminPageHeader title="Invoices" description="Generated invoice records for paid orders." />
      {list.error ? (
        <div className="alert alert-danger radius-8 mb-24" role="alert">
          {list.error}
        </div>
      ) : null}

      <AdminDataCard
        title="All invoices"
        toolbar={<AdminSearchInput value={list.query} onChange={list.setQuery} placeholder="Search invoice number…" />}
      >
        {list.loading && list.rows.length === 0 ? <LoadingState /> : null}
        {!list.loading || list.rows.length > 0 ? (
          <div className="workiz-admin-table-wrap" aria-busy={list.loading}>
            <table className="table bordered-table mb-0">
              <thead>
                <tr>
                  <th scope="col">Number</th>
                  <th scope="col">Issued</th>
                  <th scope="col">Billed to</th>
                  <th scope="col">Amount</th>
                  <th scope="col">
                    <span className="visually-hidden">Download</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {list.rows.map((inv) => (
                  <tr key={inv.id}>
                    <td className="fw-medium text-primary-light">{inv.number}</td>
                    <td className="text-nowrap">{formatDate(inv.issued_at)}</td>
                    <td>
                      <div>{inv.order?.organization?.name || inv.order?.user?.full_name || inv.order?.user?.email || "—"}</div>
                      {inv.order ? (
                        <StatusBadge label={inv.order.kind === "seats" ? "Seats" : "Course"} tone="info" />
                      ) : null}
                    </td>
                    <td className="dirham-sign text-nowrap">{formatMoney(inv.amount_cents, "aed")}</td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-outline-primary-600 btn-sm radius-8"
                        disabled={downloading === inv.id}
                        aria-label={`Download invoice ${inv.number}`}
                        onClick={() => void download(inv)}
                      >
                        {downloading === inv.id ? "Preparing…" : "Download"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!list.loading && list.rows.length === 0 ? (
              <EmptyState message={list.query ? "No invoices match your search." : "No invoices yet."} />
            ) : null}
          </div>
        ) : null}
        <Pagination page={list.page} pageSize={list.pageSize} total={list.total} onPageChange={list.setPage} label="invoices" />
      </AdminDataCard>
    </AdminShell>
  );
}
