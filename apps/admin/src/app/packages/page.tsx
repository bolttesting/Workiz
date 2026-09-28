"use client";

import { useEffect, useState } from "react";
import { AdminShell } from "@/components/AdminShell";
import { AdminPageHeader, EmptyState, LoadingState } from "@/components/AdminUi";
import { apiClient } from "@/lib/api";
import { centsFromMajor, majorFromCents } from "@/lib/uploads";
import { DIRHAM_SIGN, formatMoney } from "@workix/config";

type Plan = {
  id: string;
  name: string;
  blurb: string;
  seats: number;
  monthlyCents: number;
  pricePerSeatCents: number | null;
  minSeats: number | null;
  maxSeats: number | null;
  custom: boolean;
  popular: boolean;
  features: string[];
};

type Draft = {
  name: string;
  blurb: string;
  seats: number;
  monthly: number;
  perSeat: number;
  minSeats: number;
  maxSeats: number;
  features: string;
  popular: boolean;
};

function toDraft(plan: Plan): Draft {
  return {
    name: plan.name,
    blurb: plan.blurb,
    seats: plan.seats,
    monthly: majorFromCents(plan.monthlyCents),
    perSeat: majorFromCents(plan.pricePerSeatCents ?? 0),
    minSeats: plan.minSeats ?? 1,
    maxSeats: plan.maxSeats ?? plan.seats,
    features: plan.features.join("\n"),
    popular: plan.popular,
  };
}

export default function PackagesPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  useEffect(() => {
    apiClient<{ plans: Plan[] }>("/admin/plans")
      .then((res) => {
        setPlans(res.plans);
        setDrafts(Object.fromEntries(res.plans.map((plan) => [plan.id, toDraft(plan)])));
        setError(null);
      })
      .catch((err) => setError((err as Error).message))
      .finally(() => setLoading(false));
  }, []);

  function patchDraft(id: string, patch: Partial<Draft>) {
    setDrafts((prev) => ({ ...prev, [id]: { ...prev[id]!, ...patch } }));
  }

  async function save(plan: Plan) {
    const draft = drafts[plan.id];
    if (!draft) return;
    setBusyId(plan.id);
    setError(null);
    setOk(null);
    try {
      const features = draft.features
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
      const monthlyCents = plan.custom ? centsFromMajor(draft.perSeat) * draft.seats : centsFromMajor(draft.monthly);
      const saved = await apiClient<{ plan: Plan }>(`/admin/plans/${plan.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: draft.name.trim(),
          blurb: draft.blurb.trim(),
          seats: draft.seats,
          monthlyCents,
          pricePerSeatCents: plan.custom ? centsFromMajor(draft.perSeat) : null,
          minSeats: plan.custom ? draft.minSeats : null,
          maxSeats: plan.custom ? draft.maxSeats : null,
          features,
          popular: draft.popular,
        }),
      });
      setPlans((prev) => prev.map((row) => (row.id === plan.id ? saved.plan : row)));
      setDrafts((prev) => ({ ...prev, [plan.id]: toDraft(saved.plan) }));
      setOk(`${saved.plan.name} updated. The public Companies page uses this price.`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <AdminShell>
      <AdminPageHeader
        title="Company packages"
        description="Edit the seat packages shown on the public Companies page. Prices are in Dirhams."
      />
      {error ? (
        <div className="alert alert-danger radius-8 mb-24" role="alert">
          {error}
        </div>
      ) : null}
      {ok ? (
        <div className="alert alert-success radius-8 mb-24" role="status">
          {ok}
        </div>
      ) : null}
      {loading ? <LoadingState /> : null}
      {!loading && plans.length === 0 ? <EmptyState message="No packages yet." /> : null}
      <div className="row gy-4">
        {plans.map((plan) => {
          const draft = drafts[plan.id];
          if (!draft) return null;
          return (
            <div className="col-lg-6" key={plan.id}>
              <form
                className="card radius-12 shadow-1 h-100"
                onSubmit={(e) => {
                  e.preventDefault();
                  void save(plan);
                }}
              >
                <div className="card-header border-bottom bg-base py-16 px-24 d-flex justify-content-between align-items-center">
                  <h6 className="mb-0 fw-semibold">{plan.custom ? "Custom package" : "Fixed package"}</h6>
                  <span className="dirham-sign text-sm text-secondary-light">
                    {formatMoney(plan.custom ? (plan.pricePerSeatCents ?? 0) : plan.monthlyCents, "aed")}
                    {plan.custom ? " / seat" : " / month"}
                  </span>
                </div>
                <div className="card-body row gy-3">
                  <div className="col-md-8">
                    <label className="form-label">Name</label>
                    <input
                      className="form-control radius-8"
                      value={draft.name}
                      onChange={(e) => patchDraft(plan.id, { name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Seats</label>
                    <input
                      className="form-control radius-8"
                      type="number"
                      min={1}
                      value={draft.seats}
                      onChange={(e) => patchDraft(plan.id, { seats: Number(e.target.value) })}
                      required
                    />
                  </div>
                  <div className="col-12">
                    <label className="form-label">Description</label>
                    <input
                      className="form-control radius-8"
                      value={draft.blurb}
                      onChange={(e) => patchDraft(plan.id, { blurb: e.target.value })}
                    />
                  </div>
                  {plan.custom ? (
                    <>
                      <div className="col-md-4">
                        <label className="form-label">Price per seat</label>
                        <div className="input-group">
                          <span className="input-group-text dirham-sign">{DIRHAM_SIGN}</span>
                          <input
                            className="form-control radius-8"
                            type="number"
                            min={0}
                            step="0.01"
                            value={draft.perSeat}
                            onChange={(e) => patchDraft(plan.id, { perSeat: Number(e.target.value) })}
                          />
                        </div>
                      </div>
                      <div className="col-md-4">
                        <label className="form-label">Minimum seats</label>
                        <input
                          className="form-control radius-8"
                          type="number"
                          min={1}
                          value={draft.minSeats}
                          onChange={(e) => patchDraft(plan.id, { minSeats: Number(e.target.value) })}
                        />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label">Maximum seats</label>
                        <input
                          className="form-control radius-8"
                          type="number"
                          min={1}
                          value={draft.maxSeats}
                          onChange={(e) => patchDraft(plan.id, { maxSeats: Number(e.target.value) })}
                        />
                      </div>
                    </>
                  ) : (
                    <div className="col-md-6">
                      <label className="form-label">Monthly price</label>
                      <div className="input-group">
                        <span className="input-group-text dirham-sign">{DIRHAM_SIGN}</span>
                        <input
                          className="form-control radius-8"
                          type="number"
                          min={0}
                          step="0.01"
                          value={draft.monthly}
                          onChange={(e) => patchDraft(plan.id, { monthly: Number(e.target.value) })}
                        />
                      </div>
                    </div>
                  )}
                  <div className="col-12">
                    <label className="form-label">Features (one per line)</label>
                    <textarea
                      className="form-control radius-8"
                      rows={5}
                      value={draft.features}
                      onChange={(e) => patchDraft(plan.id, { features: e.target.value })}
                    />
                    <p className="text-sm text-secondary-light mt-8 mb-0">
                      Use __SEATS__ in a line to show the selected seat count.
                    </p>
                  </div>
                  <div className="col-12">
                    <label className="form-check">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        checked={draft.popular}
                        onChange={(e) => patchDraft(plan.id, { popular: e.target.checked })}
                      />
                      <span className="form-check-label">Mark as most popular</span>
                    </label>
                  </div>
                  <div className="col-12">
                    <button type="submit" className="btn btn-primary-600 radius-8" disabled={busyId === plan.id}>
                      {busyId === plan.id ? "Saving…" : "Save package"}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          );
        })}
      </div>
    </AdminShell>
  );
}
