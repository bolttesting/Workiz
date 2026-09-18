"use client";

import { useEffect, useState } from "react";
import { LearnShell } from "@/components/LearnShell";
import { apiClient } from "@/lib/api";
import { formatMoney } from "@workix/config";

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<{ id: string; number: string; amount_cents: number; currency: string; pdf_key: string | null }[]>([]);
  useEffect(() => {
    apiClient<{ invoices: typeof invoices }>("/me/invoices")
      .then((r) => setInvoices(r.invoices))
      .catch(() => undefined);
  }, []);
  return (
    <LearnShell>
      <h6 className="mb-24">Invoices</h6>
      <div className="card radius-12">
        <table className="table bordered-table">
          <thead>
            <tr>
              <th>Number</th>
              <th>Amount</th>
              <th>PDF</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => (
              <tr key={inv.id}>
                <td>{inv.number}</td>
                <td>{formatMoney(inv.amount_cents, inv.currency)}</td>
                <td>{inv.pdf_key ? "Ready" : "Pending"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </LearnShell>
  );
}
