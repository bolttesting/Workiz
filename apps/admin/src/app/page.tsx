"use client";

import { useEffect, useState } from "react";
import { AdminShell } from "@/components/AdminShell";
import { apiClient } from "@/lib/api";

export default function AdminHome() {
  const [stats, setStats] = useState({ users: 0, orgs: 0, courses: 0, orders: 0 });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiClient<typeof stats>("/admin/stats")
      .then(setStats)
      .catch((err) => setError((err as Error).message));
  }, []);

  const cards = [
    { label: "Users", value: stats.users },
    { label: "Companies", value: stats.orgs },
    { label: "Courses", value: stats.courses },
    { label: "Paid orders", value: stats.orders },
  ];

  return (
    <AdminShell>
      <h6 className="mb-24">Overview</h6>
      {error ? <p className="text-danger">{error}</p> : null}
      <div className="row gy-4">
        {cards.map((card) => (
          <div className="col-md-3" key={card.label}>
            <div className="card radius-12">
              <div className="card-body">
                <span className="text-secondary-light">{card.label}</span>
                <h3 className="mb-0">{card.value}</h3>
              </div>
            </div>
          </div>
        ))}
      </div>
    </AdminShell>
  );
}
