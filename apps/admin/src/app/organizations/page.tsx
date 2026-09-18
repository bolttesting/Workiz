"use client";

import { useEffect, useState } from "react";
import { AdminShell } from "@/components/AdminShell";
import { apiClient } from "@/lib/api";
import type { Organization } from "@workix/db/types";

export default function OrgsPage() {
  const [orgs, setOrgs] = useState<Organization[]>([]);
  useEffect(() => {
    apiClient<{ organizations: Organization[] }>("/admin/organizations")
      .then((r) => setOrgs(r.organizations))
      .catch(() => undefined);
  }, []);
  return (
    <AdminShell>
      <h6 className="mb-24">Companies</h6>
      <div className="card radius-12">
        <table className="table mb-0">
          <thead>
            <tr>
              <th>Name</th>
              <th>Seats</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {orgs.map((o) => (
              <tr key={o.id}>
                <td>{o.name}</td>
                <td>
                  {o.seat_used}/{o.seat_limit}
                </td>
                <td>{o.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
