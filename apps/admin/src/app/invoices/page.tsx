"use client";

import { useEffect, useState } from "react";
import { AdminShell } from "@/components/AdminShell";
import { apiClient } from "@/lib/api";
import { formatMoney } from "@workix/config";

type Invoice = { id: string; number: string; amount_cents: number; currency: string; pdf_key: string | null };

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  useEffect(() => {
    apiClient<{ invoices: Invoice[] }>("/admin/invoices").then((r) => setInvoices(r.invoices)).catch(() => undefined);
  }, []);
  return (
    <AdminShell>
      <h6 className="mb-24">Invoices</h6>
      <div className="card radius-12">
        <table className="table mb-0">
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
                <td>{inv.pdf_key ?? "pending"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
