"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
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

type Order = {
  id: string;
  kind: string;
  status: string;
  amount_cents: number;
  currency: string;
  created_at: string;
  user_id?: string | null;
  organization_id?: string | null;
  stripe_checkout_session_id?: string | null;
};

function statusTone(status: string) {
  if (status === "paid") return "success" as const;
  if (status === "pending") return "warning" as const;
  if (status === "failed") return "danger" as const;
  if (status === "refunded") return "info" as const;
  return "neutral" as const;
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    apiClient<{ orders: Order[] }>("/admin/orders")
      .then((r) => {
        setOrders(r.orders);
        setError(null);
      })
      .catch((err) => setError((err as Error).message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(
    () =>
      orders.filter((o) =>
        matchesQuery(query, [o.id, o.kind, o.status, o.user_id, o.organization_id, o.created_at]),
      ),
    [orders, query],
  );

  return (
    <AdminShell>
      <AdminPageHeader title="Orders" description="Review course and seat purchases. Refunds are handled in Stripe." />
      {error ? (
        <div className="alert alert-danger radius-8 mb-24" role="alert">
          {error}
        </div>
      ) : null}

      <AdminDataCard
        title="All orders"
        toolbar={<AdminSearchInput value={query} onChange={setQuery} placeholder="Search orders…" />}
      >
        {loading ? <LoadingState /> : null}
        {!loading ? (
          <div className="workiz-admin-table-wrap">
            <table className="table bordered-table mb-0">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Kind</th>
                  <th>Status</th>
                  <th>Amount</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((o) => (
                  <Fragment key={o.id}>
                    <tr>
                      <td>{o.created_at?.slice(0, 10) || "—"}</td>
                      <td>
                        <StatusBadge label={o.kind} tone="info" />
                      </td>
                      <td>
                        <StatusBadge label={o.status} tone={statusTone(o.status)} />
                      </td>
                      <td>{formatMoney(o.amount_cents, o.currency)}</td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-outline-primary-600 btn-sm radius-8"
                          onClick={() => setExpandedId((id) => (id === o.id ? null : o.id))}
                        >
                          {expandedId === o.id ? "Hide" : "Details"}
                        </button>
                      </td>
                    </tr>
                    {expandedId === o.id ? (
                      <tr>
                        <td colSpan={5} className="workiz-admin-expand">
                          <div className="p-12 text-sm">
                            <div>
                              <strong>Order ID:</strong> {o.id}
                            </div>
                            <div>
                              <strong>User:</strong> {o.user_id || "—"}
                            </div>
                            <div>
                              <strong>Organization:</strong> {o.organization_id || "—"}
                            </div>
                            <div>
                              <strong>Stripe session:</strong> {o.stripe_checkout_session_id || "—"}
                            </div>
                          </div>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 ? <EmptyState message="No orders match your search." /> : null}
          </div>
        ) : null}
      </AdminDataCard>
    </AdminShell>
  );
}
