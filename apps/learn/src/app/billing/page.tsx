"use client";

import { useCallback, useEffect, useState } from "react";
import { LearnShell } from "@/components/LearnShell";
import { EmptyState, LearnDataCard, LearnPageHeader, LoadingState, StatusBadge } from "@/components/LearnUi";
import { apiClient, downloadFile } from "@/lib/api";
import { formatMoney } from "@workix/config";

type BillingInvoice = {
  id: string;
  number: string;
  amountCents: number;
  currency: string;
  issuedAt: string | null;
};

type Billing = {
  companyName: string;
  seats: number;
  seatsUsed: number;
  status: string;
  monthlyCents: number | null;
  renewsAt: string | null;
  cancelAtPeriodEnd: boolean;
  hasSubscription: boolean;
  invoices: BillingInvoice[];
};

function renewLabel(billing: Billing) {
  const date = billing.renewsAt ? billing.renewsAt.slice(0, 10) : null;
  if (billing.cancelAtPeriodEnd) return date ? `Seats stay open until ${date}` : "Cancellation is scheduled";
  if (!billing.hasSubscription) return "No monthly card payment on file";
  return date ? `Next payment ${date}` : "Renews every month";
}

export default function BillingPage() {
  const [billing, setBilling] = useState<Billing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [busy, setBusy] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient<{ billing: Billing }>("/orgs/billing");
      setBilling(res.billing);
    } catch (err) {
      setError((err as Error).message || "Could not load billing.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function cancelPackage() {
    setBusy(true);
    setError(null);
    try {
      const res = await apiClient<{ billing: Billing }>("/orgs/billing/cancel", { method: "POST" });
      setBilling(res.billing);
      setConfirmCancel(false);
      setNotice("The package will not renew. Seats stay open until the date you already paid through.");
    } catch (err) {
      setError((err as Error).message || "Could not cancel the package.");
    } finally {
      setBusy(false);
    }
  }

  const statusTone =
    billing?.status === "active" ? "success" : billing?.status === "past_due" ? "warning" : "danger";

  return (
    <LearnShell>
      <LearnPageHeader
        title="Billing"
        description="The company package is charged every month. You can cancel it at any time."
      />
      {error ? (
        <div className="alert alert-danger radius-8 mb-24" role="alert">
          {error}
        </div>
      ) : null}
      {notice ? (
        <div className="alert alert-success radius-8 mb-24" role="status">
          {notice}
        </div>
      ) : null}
      {loading ? <LoadingState message="Loading billing…" /> : null}
      {!loading && billing ? (
        <>
          <div className="row gy-4 mb-24">
            <div className="col-md-4">
              <div className="card shadow-1 radius-8 h-100 gradient-bg-end-1">
                <div className="card-body p-20">
                  <p className="fw-medium text-primary-light mb-8">Package</p>
                  <h6 className="mb-8">{billing.companyName}</h6>
                  <p className="mb-0 text-sm text-secondary-light">
                    {billing.seatsUsed} of {billing.seats} seats in use
                  </p>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="card shadow-1 radius-8 h-100 gradient-bg-end-3">
                <div className="card-body p-20">
                  <p className="fw-medium text-primary-light mb-8">Monthly payment</p>
                  <h6 className="mb-8 dirham-sign">
                    {billing.monthlyCents != null ? formatMoney(billing.monthlyCents, "aed") : "—"}
                  </h6>
                  <p className="mb-0 text-sm text-secondary-light">Charged every month</p>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="card shadow-1 radius-8 h-100 gradient-bg-end-5">
                <div className="card-body p-20">
                  <p className="fw-medium text-primary-light mb-8">Status</p>
                  <div className="mb-8">
                    <StatusBadge
                      label={billing.cancelAtPeriodEnd ? "Cancels this month" : billing.status.replaceAll("_", " ")}
                      tone={billing.cancelAtPeriodEnd ? "warning" : statusTone}
                    />
                  </div>
                  <p className="mb-0 text-sm text-secondary-light">{renewLabel(billing)}</p>
                </div>
              </div>
            </div>
          </div>

          <LearnDataCard title="Package">
            <p className="text-secondary-light">
              Payment is taken once a month for the seats on this package. Cancel any time and the next charge will not
              run. People keep their courses until the end of the month you already paid for.
            </p>
            {billing.cancelAtPeriodEnd ? (
              <p className="mb-0">This package will not renew.</p>
            ) : billing.hasSubscription ? (
              confirmCancel ? (
                <div className="d-flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="btn btn-danger-600 radius-8"
                    disabled={busy}
                    onClick={() => void cancelPackage()}
                  >
                    {busy ? "Cancelling…" : "Yes, stop the next payment"}
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-primary-600 radius-8"
                    disabled={busy}
                    onClick={() => setConfirmCancel(false)}
                  >
                    Keep the package
                  </button>
                </div>
              ) : (
                <button type="button" className="btn btn-outline-danger-600 radius-8" onClick={() => setConfirmCancel(true)}>
                  Cancel package
                </button>
              )
            ) : (
              <p className="mb-0">This company was opened without a monthly card payment, so there is nothing to cancel here.</p>
            )}
          </LearnDataCard>

          <div className="mt-24">
            <LearnDataCard title="Invoices">
              {billing.invoices.length === 0 ? <EmptyState message="Paid months show up here." /> : null}
              {billing.invoices.length > 0 ? (
                <div className="workiz-admin-table-wrap">
                  <table className="table bordered-table mb-0">
                    <thead>
                      <tr>
                        <th>Number</th>
                        <th>Issued</th>
                        <th>Amount</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {billing.invoices.map((invoice) => (
                        <tr key={invoice.id}>
                          <td className="fw-medium">{invoice.number}</td>
                          <td>{invoice.issuedAt ? invoice.issuedAt.slice(0, 10) : "—"}</td>
                          <td className="dirham-sign">{formatMoney(invoice.amountCents, "aed")}</td>
                          <td className="text-end">
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-primary-600 radius-8"
                              disabled={downloading === invoice.id}
                              onClick={() => {
                                setDownloading(invoice.id);
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
                </div>
              ) : null}
            </LearnDataCard>
          </div>
        </>
      ) : null}
    </LearnShell>
  );
}
