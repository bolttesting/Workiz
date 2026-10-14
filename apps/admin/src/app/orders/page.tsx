"use client";

import { Fragment, useState } from "react";
import { AdminShell } from "@/components/AdminShell";
import {
  AdminDataCard,
  AdminPageHeader,
  AdminSearchInput,
  EmptyState,
  FilterSelect,
  LoadingState,
  Pagination,
  StatusBadge,
  formatDate,
} from "@/components/AdminUi";
import { useServerList } from "@/lib/useServerList";
import { formatMoney } from "@workix/config";

type Order = {
  id: string;
  kind: string;
  status: string;
  amount_cents: number;
  currency: string;
  created_at: string;
  seat_quantity?: number | null;
  user_id?: string | null;
  organization_id?: string | null;
  stripe_checkout_session_id?: string | null;
  user?: { full_name: string | null; email: string } | null;
  organization?: { name: string } | null;
  course?: { title: string } | null;
};

function statusTone(status: string) {
  if (status === "paid") return "success" as const;
  if (status === "pending") return "warning" as const;
  if (status === "failed") return "danger" as const;
  if (status === "refunded") return "info" as const;
  return "neutral" as const;
}

function itemLabel(order: Order) {
  if (order.kind === "seats") return order.seat_quantity ? `${order.seat_quantity} seats` : "Seats";
  return order.course?.title ?? "Course";
}

export default function OrdersPage() {
  const [status, setStatus] = useState("");
  const [kind, setKind] = useState("");
  const list = useServerList<Order>({ path: "/admin/orders", key: "orders", filters: { status, kind } });
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <AdminShell>
      <AdminPageHeader title="Orders" description="Review course and seat purchases. Refunds are handled in Stripe." />
      {list.error ? (
        <div className="alert alert-danger radius-8 mb-24" role="alert">
          {list.error}
        </div>
      ) : null}

      <AdminDataCard
        title="All orders"
        toolbar={
          <>
            <FilterSelect
              label="Filter by status"
              value={status}
              onChange={setStatus}
              options={[
                { value: "", label: "All statuses" },
                { value: "paid", label: "Paid" },
                { value: "pending", label: "Pending" },
                { value: "failed", label: "Failed" },
                { value: "refunded", label: "Refunded" },
              ]}
            />
            <FilterSelect
              label="Filter by type"
              value={kind}
              onChange={setKind}
              options={[
                { value: "", label: "Courses & seats" },
                { value: "course", label: "Courses" },
                { value: "seats", label: "Seats" },
              ]}
            />
            <AdminSearchInput value={list.query} onChange={list.setQuery} placeholder="Customer, company or order ID…" />
          </>
        }
      >
        {list.loading && list.rows.length === 0 ? <LoadingState /> : null}
        {!list.loading || list.rows.length > 0 ? (
          <div className="workiz-admin-table-wrap" aria-busy={list.loading}>
            <table className="table bordered-table mb-0">
              <thead>
                <tr>
                  <th scope="col">When</th>
                  <th scope="col">Customer</th>
                  <th scope="col">Item</th>
                  <th scope="col">Status</th>
                  <th scope="col">Amount</th>
                  <th scope="col">
                    <span className="visually-hidden">Details</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {list.rows.map((o) => (
                  <Fragment key={o.id}>
                    <tr>
                      <td className="text-nowrap">{formatDate(o.created_at)}</td>
                      <td>
                        <div className="fw-medium text-primary-light">
                          {o.organization?.name || o.user?.full_name || o.user?.email || "—"}
                        </div>
                        {o.user && (o.organization?.name || o.user.full_name) ? (
                          <div className="text-sm text-secondary-light">{o.user.email}</div>
                        ) : null}
                      </td>
                      <td>
                        <StatusBadge label={o.kind} tone="info" /> <span className="ms-4">{itemLabel(o)}</span>
                      </td>
                      <td>
                        <StatusBadge label={o.status} tone={statusTone(o.status)} />
                      </td>
                      <td className="dirham-sign text-nowrap">{formatMoney(o.amount_cents, "aed")}</td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-outline-primary-600 btn-sm radius-8"
                          aria-expanded={expandedId === o.id}
                          onClick={() => setExpandedId((id) => (id === o.id ? null : o.id))}
                        >
                          {expandedId === o.id ? "Hide" : "Details"}
                        </button>
                      </td>
                    </tr>
                    {expandedId === o.id ? (
                      <tr>
                        <td colSpan={6} className="workiz-admin-expand">
                          <dl className="p-12 text-sm mb-0 workiz-order-details">
                            <dt>Order ID</dt>
                            <dd>{o.id}</dd>
                            <dt>User</dt>
                            <dd>{o.user ? `${o.user.full_name || "—"} · ${o.user.email}` : o.user_id || "—"}</dd>
                            <dt>Organization</dt>
                            <dd>{o.organization?.name || o.organization_id || "—"}</dd>
                            <dt>Stripe session</dt>
                            <dd>{o.stripe_checkout_session_id || "—"}</dd>
                          </dl>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                ))}
              </tbody>
            </table>
            {!list.loading && list.rows.length === 0 ? (
              <EmptyState
                message={list.query || status || kind ? "No orders match these filters." : "No orders yet."}
              />
            ) : null}
          </div>
        ) : null}
        <Pagination page={list.page} pageSize={list.pageSize} total={list.total} onPageChange={list.setPage} label="orders" />
      </AdminDataCard>
    </AdminShell>
  );
}
