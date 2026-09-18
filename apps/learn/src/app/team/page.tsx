"use client";

import { useEffect, useState } from "react";
import { LearnShell } from "@/components/LearnShell";
import { apiClient } from "@/lib/api";
import type { Organization } from "@workix/db/types";

type Member = { id: string; email: string; full_name: string | null; role: string };
type Invite = { id: string; email: string; status: string; token: string };

export default function TeamPage() {
  const [org, setOrg] = useState<Organization | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);

  async function refresh() {
    const res = await apiClient<{ organization: Organization | null; members: Member[]; invites: Invite[] }>("/orgs/me");
    setOrg(res.organization);
    setMembers(res.members);
    setInvites(res.invites);
  }

  useEffect(() => {
    refresh().catch((err) => setError((err as Error).message));
  }, []);

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const res = await apiClient<{ link: string }>("/orgs/invites", {
        method: "POST",
        body: JSON.stringify({ email, role: "company_learner" }),
      });
      setLink(res.link);
      setEmail("");
      await refresh();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function remove(id: string) {
    await apiClient(`/orgs/members/${id}`, { method: "DELETE" });
    await refresh();
  }

  return (
    <LearnShell>
      <h6 className="mb-8">Team seats</h6>
      {org ? (
        <p className="text-secondary-light mb-24">
          {org.name} — {org.seat_used} / {org.seat_limit} seats used ({org.status})
        </p>
      ) : (
        <p>No company yet. Buy seats from the public pricing page.</p>
      )}
      {org ? (
        <form className="card radius-12 mb-24" onSubmit={invite}>
          <div className="card-body d-flex gap-3">
            <input className="form-control" type="email" placeholder="colleague@company.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <button className="btn btn-primary-600" type="submit">
              Invite
            </button>
          </div>
        </form>
      ) : null}
      {error ? <p className="text-danger">{error}</p> : null}
      {link ? (
        <p>
          Invite link: <a href={link}>{link}</a>
        </p>
      ) : null}
      <div className="card radius-12">
        <table className="table">
          <thead>
            <tr>
              <th>Member</th>
              <th>Role</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id}>
                <td>
                  {m.full_name} <br />
                  <small>{m.email}</small>
                </td>
                <td>{m.role}</td>
                <td>
                  <button className="btn btn-sm btn-outline-danger-600" onClick={() => remove(m.id)}>
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <h6 className="mt-24">Pending invites</h6>
      <ul>
        {invites
          .filter((i) => i.status === "pending")
          .map((i) => (
            <li key={i.id}>
              {i.email} — {i.status}
            </li>
          ))}
      </ul>
    </LearnShell>
  );
}
