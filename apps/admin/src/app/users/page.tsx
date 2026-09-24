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
  formatRole,
  matchesQuery,
} from "@/components/AdminUi";
import { apiClient } from "@/lib/api";
import type { Profile, UserRole } from "@workix/db/types";

const ROLE_OPTIONS: UserRole[] = [
  "individual_learner",
  "company_learner",
  "company_admin",
  "instructor",
  "super_admin",
];

function roleTone(role: string) {
  if (role === "super_admin") return "danger" as const;
  if (role === "instructor") return "info" as const;
  if (role === "company_admin") return "primary" as const;
  if (role === "company_learner") return "success" as const;
  return "neutral" as const;
}

export default function UsersPage() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function refresh() {
    const res = await apiClient<{ users: Profile[] }>("/admin/users");
    setUsers(res.users);
  }

  useEffect(() => {
    setLoading(true);
    refresh()
      .then(() => setError(null))
      .catch((err) => setError((err as Error).message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(
    () => users.filter((u) => matchesQuery(query, [u.full_name, u.email, u.role])),
    [users, query],
  );

  async function changeRole(userId: string, role: UserRole) {
    setBusyId(userId);
    setError(null);
    try {
      await apiClient(`/admin/users/${userId}`, {
        method: "PATCH",
        body: JSON.stringify({ role }),
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
      <AdminPageHeader title="Users" description="Search learners and staff, then update roles." />
      {error ? (
        <div className="alert alert-danger radius-8 mb-24" role="alert">
          {error}
        </div>
      ) : null}

      <AdminDataCard
        title="All users"
        toolbar={<AdminSearchInput value={query} onChange={setQuery} placeholder="Search name or email…" />}
      >
        {loading ? <LoadingState /> : null}
        {!loading ? (
          <div className="workiz-admin-table-wrap">
            <table className="table bordered-table mb-0">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Change role</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <tr key={u.id}>
                    <td className="fw-medium text-primary-light">{u.full_name || "—"}</td>
                    <td>{u.email}</td>
                    <td>
                      <StatusBadge label={formatRole(u.role)} tone={roleTone(u.role)} />
                    </td>
                    <td style={{ minWidth: 200 }}>
                      <select
                        className="form-select form-select-sm radius-8"
                        value={u.role}
                        disabled={busyId === u.id}
                        onChange={(e) => changeRole(u.id, e.target.value as UserRole)}
                      >
                        {ROLE_OPTIONS.map((role) => (
                          <option key={role} value={role}>
                            {formatRole(role)}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 ? <EmptyState message="No users match your search." /> : null}
          </div>
        ) : null}
      </AdminDataCard>
    </AdminShell>
  );
}
