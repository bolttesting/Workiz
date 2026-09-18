"use client";

import { useEffect, useState } from "react";
import { AdminShell } from "@/components/AdminShell";
import { apiClient } from "@/lib/api";
import { formatMoney } from "@workix/config";

type Order = {
  id: string;
  kind: string;
  status: string;
  amount_cents: number;
  currency: string;
  created_at: string;
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  useEffect(() => {
    apiClient<{ orders: Order[] }>("/admin/orders").then((r) => setOrders(r.orders)).catch(() => undefined);
  }, []);
  return (
    <AdminShell>
      <h6 className="mb-24">Orders</h6>
      <div className="card radius-12">
        <table className="table mb-0">
          <thead>
            <tr>
              <th>When</th>
              <th>Kind</th>
              <th>Status</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id}>
                <td>{o.created_at?.slice(0, 10)}</td>
                <td>{o.kind}</td>
                <td>{o.status}</td>
                <td>{formatMoney(o.amount_cents, o.currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
