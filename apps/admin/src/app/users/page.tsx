"use client";

import { useState } from "react";
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
  formatRole,
  useConfirm,
} from "@/components/AdminUi";
import { apiClient } from "@/lib/api";
import { useServerList } from "@/lib/useServerList";
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
  const [role, setRole] = useState("");
  const list = useServerList<Profile>({ path: "/admin/users", key: "users", filters: { role } });
  const [busyId, setBusyId] = useState<string | null>(null);
  const { confirm, dialog } = useConfirm();

  async function changeRole(user: Profile, next: UserRole) {
    if (next === user.role) return;
    const granting = next === "super_admin";
    const ok = await confirm({
      title: `Change ${user.full_name || user.email} to ${formatRole(next)}?`,
      body: granting
        ? "Super admins can edit every course, user, company and payment setting."
        : `They are currently ${formatRole(user.role)}. Their access changes immediately.`,
      confirmLabel: "Change role",
      tone: granting || user.role === "super_admin" ? "danger" : "primary",
    });
    if (!ok) return;
    setBusyId(user.id);
    list.setError(null);
    try {
      await apiClient(`/admin/users/${user.id}`, {
        method: "PATCH",
        body: JSON.stringify({ role: next }),
      });
      list.reload();
    } catch (err) {
      list.setError((err as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <AdminShell>
      <AdminPageHeader title="Users" description="Search learners and staff, then update roles." />
      {list.error ? (
        <div className="alert alert-danger radius-8 mb-24" role="alert">
          {list.error}
        </div>
      ) : null}

      <AdminDataCard
        title="All users"
        toolbar={
          <>
            <FilterSelect
              label="Filter by role"
              value={role}
              onChange={setRole}
              options={[{ value: "", label: "All roles" }, ...ROLE_OPTIONS.map((r) => ({ value: r, label: formatRole(r) }))]}
            />
            <AdminSearchInput value={list.query} onChange={list.setQuery} placeholder="Search name or email…" />
          </>
        }
      >
        {list.loading && list.rows.length === 0 ? <LoadingState /> : null}
        {!list.loading || list.rows.length > 0 ? (
          <div className="workiz-admin-table-wrap" aria-busy={list.loading}>
            <table className="table bordered-table mb-0">
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">Email</th>
                  <th scope="col">Role</th>
                  <th scope="col">Joined</th>
                  <th scope="col">Change role</th>
                </tr>
              </thead>
              <tbody>
                {list.rows.map((u) => (
                  <tr key={u.id}>
                    <td className="fw-medium text-primary-light">{u.full_name || "—"}</td>
                    <td>{u.email}</td>
                    <td>
                      <StatusBadge label={formatRole(u.role)} tone={roleTone(u.role)} />
                    </td>
                    <td className="text-nowrap">{formatDate(u.created_at)}</td>
                    <td className="workiz-role-cell">
                      <select
                        className="form-select form-select-sm radius-8"
                        value={u.role}
                        disabled={busyId === u.id}
                        aria-label={`Role for ${u.full_name || u.email}`}
                        onChange={(e) => changeRole(u, e.target.value as UserRole)}
                      >
                        {ROLE_OPTIONS.map((r) => (
                          <option key={r} value={r}>
                            {formatRole(r)}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!list.loading && list.rows.length === 0 ? (
              <EmptyState message={list.query || role ? "No users match these filters." : "No users yet."} />
            ) : null}
          </div>
        ) : null}
        <Pagination page={list.page} pageSize={list.pageSize} total={list.total} onPageChange={list.setPage} label="users" />
      </AdminDataCard>
      {dialog}
    </AdminShell>
  );
}
