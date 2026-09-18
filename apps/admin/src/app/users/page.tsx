"use client";

import { useEffect, useState } from "react";
import { AdminShell } from "@/components/AdminShell";
import { apiClient } from "@/lib/api";
import type { Profile } from "@workix/db/types";

export default function UsersPage() {
  const [users, setUsers] = useState<Profile[]>([]);
  useEffect(() => {
    apiClient<{ users: Profile[] }>("/admin/users").then((r) => setUsers(r.users)).catch(() => undefined);
  }, []);
  return (
    <AdminShell>
      <h6 className="mb-24">Users</h6>
      <div className="card radius-12">
        <table className="table mb-0">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.full_name}</td>
                <td>{u.email}</td>
                <td>{u.role}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
