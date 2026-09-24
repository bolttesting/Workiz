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
import type { Organization, OrgStatus, Profile } from "@workix/db/types";

const STATUS_OPTIONS: OrgStatus[] = ["incomplete", "active", "past_due", "canceled"];

function statusTone(status: string) {
  if (status === "active") return "success" as const;
  if (status === "past_due") return "warning" as const;
  if (status === "canceled") return "danger" as const;
  return "neutral" as const;
}

export default function OrgsPage() {
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [draftLimits, setDraftLimits] = useState<Record<string, number>>({});
  const [form, setForm] = useState({
    name: "",
    billing_email: "",
    seat_limit: 50,
    adminUserId: "",
  });

  async function refresh() {
    const [orgRes, userRes] = await Promise.all([
      apiClient<{ organizations: Organization[] }>("/admin/organizations"),
      apiClient<{ users: Profile[] }>("/admin/users"),
    ]);
    setOrgs(orgRes.organizations);
    setUsers(userRes.users);
    setDraftLimits(
      Object.fromEntries(orgRes.organizations.map((org) => [org.id, org.seat_limit])),
    );
  }

  useEffect(() => {
    setLoading(true);
    refresh()
      .then(() => setError(null))
      .catch((err) => setError((err as Error).message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(
    () => orgs.filter((o) => matchesQuery(query, [o.name, o.billing_email, o.status])),
    [orgs, query],
  );

  const adminCandidates = useMemo(
    () =>
      users.filter(
        (u) =>
          u.role === "individual_learner" ||
          u.role === "company_learner" ||
          u.role === "company_admin" ||
          !u.organization_id,
      ),
    [users],
  );

  async function createCompany(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError(null);
    setOk(null);
    try {
      await apiClient("/admin/organizations", {
        method: "POST",
        body: JSON.stringify({
          name: form.name.trim(),
          billing_email: form.billing_email.trim() || null,
          seat_limit: form.seat_limit,
          status: "active",
          adminUserId: form.adminUserId || null,
        }),
      });
      setForm({ name: "", billing_email: "", seat_limit: 50, adminUserId: "" });
      setOk("Company created with seats. Company admin can sign in and invite learners.");
      await refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setCreating(false);
    }
  }

  async function saveOrg(
    org: Organization,
    patch: { seat_limit?: number; status?: OrgStatus; adminUserId?: string },
  ) {
    setBusyId(org.id);
    setError(null);
    setOk(null);
    try {
      await apiClient(`/admin/organizations/${org.id}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
      await refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <AdminShell>
      <AdminPageHeader
        title="Companies"
        description="Create companies for offline payments, set seat limits, and assign a company admin."
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

      <form className="card radius-12 shadow-1 mb-24" onSubmit={createCompany}>
        <div className="card-header border-bottom bg-base py-16 px-24">
          <h6 className="mb-0 fw-semibold">Add company (offline / bank transfer)</h6>
          <p className="text-sm text-secondary-light mb-0 mt-4">
            Use this when the company paid outside Stripe. Creates an active seat pool immediately.
          </p>
        </div>
        <div className="card-body row gy-3">
          <div className="col-md-6">
            <label className="form-label">Company name *</label>
            <input
              className="form-control radius-8"
              value={form.name}
              onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
              required
              placeholder="Acme Trading LLC"
            />
          </div>
          <div className="col-md-6">
            <label className="form-label">Billing email</label>
            <input
              className="form-control radius-8"
              type="email"
              value={form.billing_email}
              onChange={(e) => setForm((s) => ({ ...s, billing_email: e.target.value }))}
              placeholder="billing@company.com"
            />
          </div>
          <div className="col-md-4">
            <label className="form-label">Seat limit *</label>
            <input
              className="form-control radius-8"
              type="number"
              min={1}
              value={form.seat_limit}
              onChange={(e) => setForm((s) => ({ ...s, seat_limit: Number(e.target.value) }))}
              required
            />
          </div>
          <div className="col-md-8">
            <label className="form-label">Company admin (existing user)</label>
            <select
              className="form-select radius-8"
              value={form.adminUserId}
              onChange={(e) => setForm((s) => ({ ...s, adminUserId: e.target.value }))}
            >
              <option value="">Assign later…</option>
              {adminCandidates.map((u) => (
                <option key={u.id} value={u.id}>
                  {(u.full_name || "User") + " — " + u.email}
                </option>
              ))}
            </select>
            <p className="text-sm text-secondary-light mt-8 mb-0">
              They must already have an account (sign up on the website). You promote them here; they invite staff from
              Learn.
            </p>
          </div>
          <div className="col-12">
            <button type="submit" className="btn btn-primary-600 radius-8" disabled={creating}>
              {creating ? "Creating…" : "Create company + seats"}
            </button>
          </div>
        </div>
      </form>

      <AdminDataCard
        title="All companies"
        toolbar={<AdminSearchInput value={query} onChange={setQuery} placeholder="Search companies…" />}
      >
        {loading ? <LoadingState /> : null}
        {!loading ? (
          <div className="workiz-admin-table-wrap">
            <table className="table bordered-table mb-0">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Seats</th>
                  <th>Seat limit</th>
                  <th>Status</th>
                  <th>Assign admin</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((o) => (
                  <tr key={o.id}>
                    <td>
                      <div className="fw-semibold text-primary-light">{o.name}</div>
                      <div className="text-sm text-secondary-light">{o.billing_email || "—"}</div>
                    </td>
                    <td>
                      {o.seat_used}/{o.seat_limit}
                    </td>
                    <td style={{ minWidth: 140 }}>
                      <input
                        className="form-control form-control-sm radius-8"
                        type="number"
                        min={0}
                        value={draftLimits[o.id] ?? o.seat_limit}
                        onChange={(e) =>
                          setDraftLimits((prev) => ({ ...prev, [o.id]: Number(e.target.value) }))
                        }
                      />
                    </td>
                    <td>
                      <select
                        className="form-select form-select-sm radius-8"
                        value={o.status}
                        disabled={busyId === o.id}
                        onChange={(e) => saveOrg(o, { status: e.target.value as OrgStatus })}
                      >
                        {STATUS_OPTIONS.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                      <div className="mt-8">
                        <StatusBadge label={o.status} tone={statusTone(o.status)} />
                      </div>
                    </td>
                    <td style={{ minWidth: 220 }}>
                      <select
                        className="form-select form-select-sm radius-8"
                        defaultValue=""
                        disabled={busyId === o.id}
                        onChange={(e) => {
                          const id = e.target.value;
                          if (id) saveOrg(o, { adminUserId: id });
                          e.target.value = "";
                        }}
                      >
                        <option value="">Set company admin…</option>
                        {adminCandidates.map((u) => (
                          <option key={u.id} value={u.id}>
                            {(u.full_name || "User") + " — " + u.email}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-primary-600 btn-sm radius-8"
                        disabled={busyId === o.id || draftLimits[o.id] === o.seat_limit}
                        onClick={() => saveOrg(o, { seat_limit: draftLimits[o.id] ?? o.seat_limit })}
                      >
                        Save seats
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 ? <EmptyState message="No companies match your search." /> : null}
          </div>
        ) : null}
      </AdminDataCard>
    </AdminShell>
  );
}
