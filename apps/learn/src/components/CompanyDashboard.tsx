"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatMoney } from "@workix/config";
import { EmptyState, StatusBadge } from "@/components/LearnUi";
import { apiClient, downloadFile } from "@/lib/api";
import { snoozeToday, snoozedToday } from "@/lib/snooze";

export type CompanyMember = {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  created_at?: string | null;
  department?: string | null;
};
export type CompanyInvite = { id: string; email: string; status: string };
export type CompanyCourse = {
  title: string;
  status: string;
  dueAt: string | null;
  dueStatus: string;
  quizStatus?: string;
  quizScore?: number | null;
};
export type CompanyCertificate = {
  id: string;
  name: string | null;
  courseTitle: string;
  expiresAt?: string | null;
};
export type CompanyProgress = {
  userId: string;
  name: string | null;
  email: string;
  department: string | null;
  courses: CompanyCourse[];
};
export type CompanyActivity = { id: string; actorName: string | null; action: string; detail: string; createdAt: string };
export type CompanyBillingLine = {
  monthlyCents: number | null;
  renewsAt: string | null;
  cancelAtPeriodEnd: boolean;
  status: string;
  hasSubscription: boolean;
  invoices?: { id: string; number: string; amountCents: number; issuedAt: string | null }[];
  problemOrders?: { id: string; status: string; amountCents: number; createdAt: string | null; label: string }[];
  monthSources?: { label: string; amountCents: number }[];
  paymentsByMonth?: { key: string; amountCents: number }[];
  paymentsByDay?: { key: string; amountCents: number }[];
  mailNote?: string | null;
};

export type CompanyRequest = {
  id: string;
  name: string | null;
  email: string;
  courseTitle: string;
};

export type CompanyHome = {
  name: string;
  seatUsed: number;
  seatLimit: number;
  seatsOpen: number;
  members: CompanyMember[];
  pendingInvites: number;
  progress: CompanyProgress[];
  activity: CompanyActivity[];
  billing: CompanyBillingLine | null;
  requests: CompanyRequest[];
  note?: string;
  certificates?: CompanyCertificate[];
};

function billingLine(billing: CompanyBillingLine) {
  const date = billing.renewsAt ? billing.renewsAt.slice(0, 10) : null;
  if (!billing.hasSubscription) return "No monthly card payment on file.";
  const amount = billing.monthlyCents != null ? `${formatMoney(billing.monthlyCents, "aed")} a month` : null;
  if (billing.status === "past_due") return amount ? `${amount} is past due.` : "The monthly payment is past due.";
  if (billing.cancelAtPeriodEnd) {
    return amount
      ? `${amount}. Cancels this month${date ? `, seats stay until ${date}` : ""}.`
      : `Cancels this month${date ? `, seats stay until ${date}` : ""}.`;
  }
  if (amount && date) return `${amount}. Next charge ${date}.`;
  if (amount) return `${amount}.`;
  return date ? `Next charge ${date}.` : "Monthly payment is active.";
}

function aed(cents: number) {
  const major = cents / 100;
  const whole = Number.isInteger(major);
  return `AED ${major.toLocaleString("en-US", { minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: 2 })}`;
}

function monthLabel(month: string) {
  const parts = month.split("-");
  const y = Number(parts[0] || "1970");
  const m = Number(parts[1] || "1");
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleString("en-US", { month: "short", year: "2-digit", timeZone: "UTC" });
}

function dayLabel(day: string) {
  const parts = day.split("-");
  return String(Number(parts[2] || "1"));
}

function personName(row: { name: string | null; email: string }) {
  return row.name?.trim() || row.email;
}

function remindedPhrase(person: string, activity: CompanyActivity[]) {
  const needle = person.trim().toLowerCase();
  if (needle.length < 2) return "";
  const hit = activity.find((event) => event.action === "Reminded" && event.detail.toLowerCase().includes(needle));
  if (!hit?.createdAt) return "";
  const day = new Date(hit.createdAt).toLocaleDateString("en-CA", { timeZone: "Asia/Dubai" });
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Dubai" });
  const yesterday = new Date(Date.now() - 86_400_000).toLocaleDateString("en-CA", { timeZone: "Asia/Dubai" });
  if (day === today) return " · Reminded today";
  if (day === yesterday) return " · Reminded yesterday";
  return "";
}

function dueLabel(status: string) {
  if (status === "overdue") return { label: "Overdue", tone: "danger" as const };
  if (status === "due_soon") return { label: "Due soon", tone: "warning" as const };
  return { label: "On track", tone: "success" as const };
}

export function CompanyDashboard({ company }: { company: CompanyHome }) {
  const assignments = company.progress.flatMap((person) =>
    person.courses.map((course) => ({
      key: `${person.userId}:${course.title}`,
      personId: person.userId,
      person: personName(person),
      department: person.department,
      course: course.title,
      dueAt: course.dueAt,
      dueStatus: course.dueStatus,
      status: course.status,
    })),
  );
  const overdue = assignments.filter((row) => row.dueStatus === "overdue");
  const dueSoon = assignments.filter((row) => row.dueStatus === "due_soon");
  const onTrack = assignments.length - overdue.length - dueSoon.length;
  const mix = [
    { label: "Overdue", count: overdue.length, color: "bg-danger-600" },
    { label: "Due soon", count: dueSoon.length, color: "bg-warning-600" },
    { label: "On track", count: Math.max(0, onTrack), color: "bg-success-600" },
  ];
  const mixTotal = Math.max(assignments.length, 1);
  const requests = company.requests ?? [];
  const pastDue = company.billing?.status === "past_due";
  const seatsFull = company.seatLimit > 0 && company.seatsOpen === 0;
  const oneSeatLeft = company.seatLimit > 0 && company.seatsOpen === 1;
  const assignedIds = new Set(company.progress.filter((person) => person.courses.length > 0).map((person) => person.userId));
  const unassigned = company.members.filter((member) => member.role === "company_learner" && !assignedIds.has(member.id));
  const weekAgo = Date.now() - 7 * 86_400_000;
  const newNames = company.members
    .filter((member) => member.role === "company_learner" && member.created_at && new Date(member.created_at).getTime() >= weekAgo)
    .map((member) => member.full_name?.trim() || member.email)
    .filter(Boolean)
    .slice(0, 6);
  const problemOrders = company.billing?.problemOrders ?? [];
  const invoices = company.billing?.invoices ?? [];
  const lede = overdue.length
    ? `${overdue.length} assigned course${overdue.length === 1 ? " is" : "s are"} overdue.`
    : dueSoon.length
      ? `${dueSoon.length} course${dueSoon.length === 1 ? " is" : "s are"} due soon.`
      : requests.length
        ? `${requests.length} course request${requests.length === 1 ? "" : "s"} waiting.`
        : pastDue
          ? "The monthly payment is past due."
          : "Nobody is late.";

  const attentionItems: {
    key: string;
    kind: "overdue" | "unpaid" | "failed" | "request" | "other";
    title: string;
    detail: string;
    badge: string;
    tone: "danger" | "warning" | "info";
    href: string;
    action: string;
    group?: string;
  }[] = [];
  if (pastDue) {
    attentionItems.push({
      key: "billing",
      kind: "unpaid",
      title: "Monthly payment is past due",
      detail: billingLine(company.billing!),
      badge: "Unpaid",
      tone: "danger",
      href: "/billing",
      action: "Billing",
    });
  }
  for (const request of requests) {
    const who = request.name?.trim() || request.email;
    attentionItems.push({
      key: `request-${request.id}`,
      kind: "request",
      title: `${who} asked for ${request.courseTitle}`,
      detail: "Assign it from Team, or dismiss the request.",
      badge: "Request",
      tone: "warning",
      href: "/team",
      action: "Review",
    });
  }
  if (company.pendingInvites > 0) {
    attentionItems.push({
      key: "invites",
      kind: "other",
      title: `${company.pendingInvites} invite${company.pendingInvites === 1 ? " has" : "s have"} not been accepted`,
      detail: "They still need to join before training can start.",
      badge: "Waiting",
      tone: "info",
      href: "/team",
      action: "Team",
    });
  }
  if (seatsFull) {
    attentionItems.push({
      key: "seats",
      kind: "other",
      title: "No seats left",
      detail: `${company.seatUsed} of ${company.seatLimit} seats are filled.`,
      badge: "Full",
      tone: "warning",
      href: "/billing",
      action: "Billing",
    });
  } else if (oneSeatLeft) {
    attentionItems.push({
      key: "seats-one",
      kind: "other",
      title: "1 seat left",
      detail: `${company.seatUsed} of ${company.seatLimit} seats are filled. One more person fills the company.`,
      badge: "Seats",
      tone: "warning",
      href: "/billing",
      action: "Billing",
    });
  }
  for (const order of problemOrders.slice(0, 3)) {
    attentionItems.push({
      key: `pay-${order.id}`,
      kind: "failed",
      title: order.status === "refunded" ? "A payment was refunded" : "A payment failed",
      detail: `${order.label} · ${aed(order.amountCents)} · ${order.createdAt?.slice(0, 10) || ""}`,
      badge: order.status === "refunded" ? "Refunded" : "Failed",
      tone: "danger",
      href: "/billing",
      action: "Billing",
    });
  }
  const unassignedSorted = [...unassigned].sort((a, b) => {
    const dept = (a.department ?? "").localeCompare(b.department ?? "");
    if (dept !== 0) return dept;
    return (a.full_name || a.email).localeCompare(b.full_name || b.email);
  });
  for (const member of unassignedSorted.slice(0, 8)) {
    const who = member.full_name?.trim() || member.email;
    attentionItems.push({
      key: `unassigned-${member.id}`,
      kind: "other",
      title: `${who} has not been assigned a course`,
      detail: member.department?.trim() || "No department",
      badge: "Not started",
      tone: "warning",
      href: `/team?person=${encodeURIComponent(who)}`,
      action: "Team",
      group: member.department?.trim() || "No department",
    });
  }
  for (const row of [...overdue, ...dueSoon].slice(0, 6)) {
    const badge = dueLabel(row.dueStatus);
    attentionItems.push({
      key: row.key,
      kind: row.dueStatus === "overdue" ? "overdue" : "other",
      title: `${row.person} · ${row.course}`,
      detail: `${row.dueAt ? `Due ${row.dueAt}` : "No due date"}${row.department ? ` · ${row.department}` : ""}${remindedPhrase(row.person, company.activity)}`,
      badge: badge.label,
      tone: badge.tone === "success" ? "info" : badge.tone,
      href: `/team?person=${encodeURIComponent(row.person)}&pace=${row.dueStatus}`,
      action: "Open",
    });
  }
  for (const person of company.progress) {
    const who = personName(person);
    for (const course of person.courses) {
      if (course.quizStatus !== "failed") continue;
      attentionItems.push({
        key: `quiz-${person.userId}-${course.title}`,
        kind: "other",
        title: `${who} failed ${course.title}`,
        detail: `${course.quizScore ?? 0}%${person.department ? ` · ${person.department}` : ""}`,
        badge: "Quiz",
        tone: "danger",
        href: `/team?person=${encodeURIComponent(who)}`,
        action: "Team",
      });
    }
  }
  const now = new Date();
  for (const cert of (company.certificates ?? []).slice(0, 6)) {
    if (!cert.expiresAt) continue;
    const expires = new Date(cert.expiresAt);
    if (Number.isNaN(expires.getTime()) || expires.getFullYear() !== now.getFullYear() || expires.getMonth() !== now.getMonth()) continue;
    const who = cert.name?.trim() || "A learner";
    attentionItems.push({
      key: `cert-${cert.id}`,
      kind: "other",
      title: `${who} · ${cert.courseTitle}`,
      detail: `Certificate expires ${cert.expiresAt.slice(0, 10)}.`,
      badge: "Expires",
      tone: "warning",
      href: `/team?person=${encodeURIComponent(who)}`,
      action: "Team",
    });
  }

  const overdueIds = [...new Set(overdue.map((row) => row.personId))];
  const snoozeKey = attentionItems.map((item) => item.key).join("|");
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState("all");
  const [mailing, setMailing] = useState(false);
  const [mailNote, setMailNote] = useState<string | null>(null);
  const [payRange, setPayRange] = useState<"month" | "year">("year");
  const [downloading, setDownloading] = useState<string | null>(null);
  const [justReminded, setJustReminded] = useState(false);
  const [noteDraft, setNoteDraft] = useState(company.note ?? "");
  const [noteSaving, setNoteSaving] = useState(false);
  useEffect(() => {
    setNoteDraft(company.note ?? "");
  }, [company.note]);
  useEffect(() => {
    setHidden(new Set(snoozeKey.split("|").filter((id) => id && snoozedToday(id))));
  }, [snoozeKey]);
  const openItems = attentionItems.filter((item) => !hidden.has(item.key));
  const kinds = [
    openItems.some((item) => item.kind === "overdue") ? { id: "overdue", label: "Overdue" } : null,
    openItems.some((item) => item.kind === "unpaid") ? { id: "unpaid", label: "Unpaid" } : null,
    openItems.some((item) => item.kind === "failed") ? { id: "failed", label: "Payments" } : null,
    openItems.some((item) => item.kind === "request") ? { id: "request", label: "Requests" } : null,
  ].filter((item): item is { id: string; label: string } => Boolean(item));
  const showFilters = openItems.length > 4 && kinds.length > 1;
  const visible = filter === "all" ? openItems : openItems.filter((item) => item.kind === filter);

  function hideForToday(key: string) {
    snoozeToday(key);
    setHidden((current) => new Set(current).add(key));
  }

  async function emailOverdue() {
    setMailing(true);
    setMailNote(null);
    try {
      const res = await apiClient<{ sent: number }>("/orgs/remind", {
        method: "POST",
        body: JSON.stringify({ userIds: overdueIds }),
      });
      setMailNote(res.sent ? `Emailed ${res.sent} ${res.sent === 1 ? "person" : "people"}.` : "No overdue email was sent.");
      if (res.sent) setJustReminded(true);
    } catch (err) {
      setMailNote((err as Error).message || "Could not send email.");
    } finally {
      setMailing(false);
    }
  }

  async function downloadInvoice(invoice: { id: string; number: string }) {
    setDownloading(invoice.id);
    try {
      await downloadFile(`/me/invoices/${invoice.id}/pdf`, `${invoice.number}.pdf`);
    } catch (err) {
      setMailNote((err as Error).message || "Could not download the invoice.");
    } finally {
      setDownloading(null);
    }
  }

  const payPoints = payRange === "month" ? (company.billing?.paymentsByDay ?? []) : (company.billing?.paymentsByMonth ?? []);
  const payMax = Math.max(1, ...payPoints.map((point) => point.amountCents));
  const monthSources = company.billing?.monthSources ?? [];

  const metrics = [
    {
      label: "People",
      value: String(company.members.length),
      meta: "Joined the company",
      icon: "ri-team-line",
      tint: "gradient-bg-end-1",
      bubble: "bg-warning-600",
    },
    {
      label: "Invites",
      value: String(company.pendingInvites),
      meta: company.pendingInvites ? "Waiting to join" : "None waiting",
      icon: "ri-mail-send-line",
      tint: "gradient-bg-end-2",
      bubble: "bg-blue-600",
    },
    {
      label: "Seats open",
      value: String(company.seatsOpen),
      meta: `${company.seatUsed} of ${company.seatLimit} filled`,
      icon: "ri-armchair-line",
      tint: "gradient-bg-end-5",
      bubble: "bg-success-600",
    },
    {
      label: "Overdue",
      value: String(overdue.length),
      meta: dueSoon.length ? `${dueSoon.length} due soon` : "No due-soon courses",
      icon: "ri-alarm-warning-line",
      tint: "gradient-bg-end-3",
      bubble: "bg-purple-600",
    },
  ];

  return (
    <div className="workiz-dash">
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
        <div>
          <h6 className="fw-semibold mb-0">{company.name}</h6>
          <p className="text-neutral-600 mt-4 mb-0">{lede}</p>
          {newNames.length > 0 ? <p className="text-neutral-600 mt-4 mb-0">New this week: {newNames.join(", ")}.</p> : null}
          {company.billing?.mailNote ? <p className="text-sm text-danger-600 mt-8 mb-0">{company.billing.mailNote}</p> : null}
          {company.billing ? <p className="text-sm text-secondary-light mt-8 mb-0 dirham-sign">{billingLine(company.billing)}</p> : null}
        </div>
        <div className="d-flex flex-wrap gap-2">
          <Link href="/team" className="btn btn-primary-600 radius-8 px-20">
            Manage team
          </Link>
          <Link href="/billing" className="btn btn-outline-primary-600 radius-8 px-20">
            Billing
          </Link>
        </div>
      </div>

      <form
        className="card shadow-1 radius-8"
        onSubmit={(event) => {
          event.preventDefault();
          setNoteSaving(true);
          void apiClient("/orgs/note", { method: "PATCH", body: JSON.stringify({ note: noteDraft.trim() || null }) })
            .then(() => setMailNote(noteDraft.trim() ? "Note saved. Learners see it on their home." : "Note cleared."))
            .catch((err) => setMailNote((err as Error).message || "Could not save the note."))
            .finally(() => setNoteSaving(false));
        }}
      >
        <div className="card-body p-20">
          <label className="fw-semibold mb-8 d-block" htmlFor="company-home-note">
            Note for learners
          </label>
          <input
            id="company-home-note"
            className="form-control radius-8"
            value={noteDraft}
            maxLength={280}
            placeholder="Safety course is due Friday"
            onChange={(event) => setNoteDraft(event.target.value)}
          />
          <button type="submit" className="btn btn-outline-primary-600 radius-8 mt-12" disabled={noteSaving}>
            {noteSaving ? "Saving…" : "Save note"}
          </button>
        </div>
      </form>

      <div className="card shadow-1 radius-8">
        <div className="card-body p-0">
          <div className="d-flex flex-wrap align-items-center justify-content-between px-20 py-16 border-bottom border-neutral-200 gap-2">
            <h6 className="text-lg mb-0">Needs attention</h6>
            <div className="d-flex align-items-center gap-3">
              {overdueIds.length > 0 ? (
                <button type="button" className="btn btn-sm btn-outline-primary-600 radius-8" disabled={mailing} onClick={() => void emailOverdue()}>
                  {mailing ? "Sending…" : "Email overdue people"}
                </button>
              ) : null}
              <Link href="/team" className="text-primary-600 fw-semibold text-sm">
                Team
              </Link>
            </div>
          </div>
          <div className="p-20">
            {mailNote ? <p className="text-sm text-secondary-light mb-12">{mailNote}</p> : null}
            {openItems.length === 0 ? (
              <EmptyState message="Nothing needs attention today." />
            ) : (
              <>
                {showFilters ? (
                  <div className="workiz-attention-filters">
                    <button type="button" className={`btn btn-sm radius-8 ${filter === "all" ? "btn-primary-600" : "btn-outline-primary-600"}`} onClick={() => setFilter("all")}>
                      All
                    </button>
                    {kinds.map((kind) => (
                      <button
                        key={kind.id}
                        type="button"
                        className={`btn btn-sm radius-8 ${filter === kind.id ? "btn-primary-600" : "btn-outline-primary-600"}`}
                        onClick={() => setFilter(kind.id)}
                      >
                        {kind.label}
                      </button>
                    ))}
                  </div>
                ) : null}
                <div className="d-flex flex-column gap-3">
                  {visible.map((item, index) => {
                    const previous = visible[index - 1];
                    const showGroup = Boolean(item.group && item.group !== previous?.group);
                    const detail =
                      justReminded && item.kind === "overdue" && !item.detail.includes("Reminded")
                        ? `${item.detail} · Reminded today`
                        : item.detail;
                    return (
                    <div key={item.key}>
                      {showGroup ? <p className="text-sm fw-semibold text-primary-light mb-0">{item.group}</p> : null}
                    <div className={`workiz-attention-row${item.kind === "overdue" || item.kind === "unpaid" || item.kind === "failed" ? " workiz-attention-row--overdue" : ""}`}>
                      <div className="workiz-attention-row__copy">
                        <div className="fw-medium">{item.title}</div>
                        <div className="text-sm text-secondary-light">{detail}</div>
                      </div>
                      <div className="workiz-attention-row__actions">
                        <StatusBadge label={item.badge} tone={item.tone} />
                        <button type="button" className="btn btn-sm btn-outline-primary-600 radius-8" onClick={() => hideForToday(item.key)}>
                          Tomorrow
                        </button>
                        <Link href={item.href} className="btn btn-sm btn-primary-600 radius-8">
                          {item.action}
                        </Link>
                      </div>
                    </div>
                    </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {company.members.length === 0 || assignments.length === 0 || !assignments.some((row) => row.dueAt) ? (
        <div className="card shadow-1 radius-8">
          <div className="card-body p-20">
            <h6 className="mb-12">Set up training</h6>
            <ul className="mb-0 d-flex flex-column gap-2">
              <li>{company.members.length || company.pendingInvites ? "People are invited." : "Invite people from Team."}</li>
              <li>{assignments.length ? "A course is assigned." : "Assign a course set from Team."}</li>
              <li>{assignments.some((row) => row.dueAt) ? "A due date is set." : "Set a due date when you assign a course."}</li>
            </ul>
            <Link href="/team" className="btn btn-primary-600 radius-8 px-16 mt-16">
              Open team
            </Link>
          </div>
        </div>
      ) : null}

      <div className="row gy-4">
        <div className="col-xxl-8">
          <div className="row gy-4">
            {metrics.map((metric) => (
              <div key={metric.label} className="col-sm-6">
                <div className={`card shadow-1 radius-8 h-100 ${metric.tint}`}>
                  <div className="card-body p-20">
                    <div className="d-flex flex-wrap align-items-center gap-3 mb-16">
                      <div className={`w-44-px h-44-px ${metric.bubble} rounded-circle d-flex justify-content-center align-items-center`}>
                        <i className={`${metric.icon} text-white text-xl`} aria-hidden="true" />
                      </div>
                      <p className="fw-medium text-primary-light mb-0">{metric.label}</p>
                    </div>
                    <h6 className="mb-0">{metric.value}</h6>
                    <p className="fw-medium text-sm text-primary-light mt-12 mb-0">{metric.meta}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="col-xxl-4">
          <div className="card h-100">
            <div className="card-body p-0">
              <div className="d-flex align-items-center justify-content-between px-20 py-16 border-bottom border-neutral-200">
                <h6 className="text-lg mb-0">Attention</h6>
              </div>
              <div className="p-20">
                {assignments.length === 0 ? (
                  <p className="mb-0 text-secondary-light">No courses assigned yet. Invite people and assign training from Team.</p>
                ) : (
                  <>
                    <div className="d-flex gap-2">
                      {mix.map((item) =>
                        item.count > 0 ? (
                          <div
                            key={item.label}
                            className={`h-44-px ${item.color} rounded`}
                            style={{ width: `${Math.max(12, Math.round((item.count / mixTotal) * 100))}%` }}
                          />
                        ) : null,
                      )}
                    </div>
                    <div className="mt-32 d-flex flex-column gap-24">
                      {mix.map((item) => (
                        <div key={item.label} className="d-flex align-items-center justify-content-between">
                          <div className="d-flex align-items-center gap-2">
                            <span className={`w-12-px h-12-px radius-2 ${item.color}`} />
                            <span className="text-neutral-600">{item.label}</span>
                          </div>
                          <span className="fw-semibold text-primary-light">{item.count}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row gy-4">
        <div className="col-xxl-7">
          <div className="card shadow-1 radius-8 h-100">
            <div className="card-body p-0">
              <div className="d-flex flex-wrap align-items-center justify-content-between px-20 py-16 border-bottom border-neutral-200 gap-2">
                <h6 className="text-lg mb-0">Payments</h6>
                <div className="d-flex flex-wrap gap-2">
                  <button
                    type="button"
                    className={`btn btn-sm radius-8 ${payRange === "month" ? "btn-primary-600" : "btn-outline-primary-600"}`}
                    aria-pressed={payRange === "month"}
                    onClick={() => setPayRange("month")}
                  >
                    This month
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm radius-8 ${payRange === "year" ? "btn-primary-600" : "btn-outline-primary-600"}`}
                    aria-pressed={payRange === "year"}
                    onClick={() => setPayRange("year")}
                  >
                    12 months
                  </button>
                </div>
              </div>
              <div className="p-20">
                {payPoints.some((point) => point.amountCents > 0) ? (
                  <>
                  <p className="visually-hidden">
                    {payPoints
                      .filter((point) => point.amountCents > 0)
                      .map((point) => `${payRange === "month" ? dayLabel(point.key) : monthLabel(point.key)} ${aed(point.amountCents)}`)
                      .join(", ")}
                  </p>
                  <div className="d-flex align-items-end gap-1" style={{ height: 140 }} aria-hidden="true">
                    {payPoints.map((point) => (
                      <div key={point.key} className="flex-grow-1 d-flex align-items-end" style={{ height: "100%" }} title={`${payRange === "month" ? dayLabel(point.key) : monthLabel(point.key)} ${aed(point.amountCents)}`}>
                        <div
                          className="w-100 rounded-top"
                          style={{
                            height: `${Math.max(point.amountCents > 0 ? 8 : 0, Math.round((point.amountCents / payMax) * 100))}%`,
                            background: "#b69856",
                          }}
                        />
                      </div>
                    ))}
                  </div>
                  </>
                ) : (
                  <p className="mb-0 text-secondary-light">No seat payments in this range.</p>
                )}
                <p className="text-sm text-neutral-600 mt-16 mb-0">
                  {monthSources.length > 0
                    ? `This month: ${monthSources.map((source) => `${source.label} ${aed(source.amountCents)}`).join(" · ")}`
                    : "No paid orders this month."}
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="col-xxl-5">
          <div className="card shadow-1 radius-8 h-100">
            <div className="card-body p-0">
              <div className="d-flex flex-wrap align-items-center justify-content-between px-20 py-16 border-bottom border-neutral-200">
                <h6 className="text-lg mb-0">Recent invoices</h6>
                <Link href="/billing" className="text-primary-600 fw-semibold text-sm">
                  Billing
                </Link>
              </div>
              <div className="p-20">
                {invoices.length === 0 ? (
                  <EmptyState message="Paid months show up here." />
                ) : (
                  <div className="workiz-admin-table-wrap">
                    <table className="table workiz-dash-table mb-0">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Amount</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {invoices.slice(0, 5).map((invoice) => (
                          <tr key={invoice.id}>
                            <td>{invoice.issuedAt?.slice(0, 10) || "—"}</td>
                            <td>{aed(invoice.amountCents)}</td>
                            <td>
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-primary-600 radius-8"
                                disabled={downloading === invoice.id}
                                onClick={() => void downloadInvoice(invoice)}
                              >
                                {downloading === invoice.id ? "Saving…" : "Download"}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card shadow-1 radius-8">
        <div className="card-body p-0">
          <div className="px-20 py-16 border-bottom border-neutral-200">
            <h6 className="text-lg mb-0">Recent activity</h6>
          </div>
          <div className="p-20">
            {company.activity.length === 0 ? (
              <EmptyState message="Invites and course assignments show up here." />
            ) : (
              <ul className="list-unstyled mb-0 d-flex flex-column gap-3">
                {company.activity.slice(0, 6).map((event) => {
                  const blob = `${event.actorName ?? ""} ${event.detail}`.toLowerCase();
                  const match = company.members.find((member) => {
                    const name = member.full_name?.trim().toLowerCase();
                    return (name && name.length > 1 && blob.includes(name)) || blob.includes(member.email.toLowerCase());
                  });
                  const label = match?.full_name?.trim() || match?.email || event.actorName;
                  const href = label ? `/team?person=${encodeURIComponent(label)}` : "/team";
                  return (
                    <li key={event.id} className="d-flex flex-wrap justify-content-between gap-2">
                      <span>
                        <Link href={href} className="fw-medium text-primary-600">
                          {event.actorName || "Someone"}
                        </Link>{" "}
                        {event.action.toLowerCase()}
                        {event.detail ? <span className="text-secondary-light"> · {event.detail}</span> : null}
                      </span>
                      <span className="text-sm text-secondary-light">{event.createdAt.slice(0, 10)}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function DepartmentGlance({
  rows,
  certificates,
}: {
  rows: CompanyProgress[];
  certificates: { name: string | null; courseTitle: string; expiresAt?: string | null }[];
}) {
  const now = new Date();
  const unassigned = rows.filter((person) => person.courses.length === 0);
  const late = rows.flatMap((person) =>
    person.courses
      .filter((course) => course.dueStatus === "overdue" || course.dueStatus === "due_soon")
      .map((course) => ({ person: personName(person), course })),
  );
  const failed = rows.flatMap((person) =>
    person.courses
      .filter((course) => course.quizStatus === "failed")
      .map((course) => ({ person: personName(person), course })),
  );
  const expiring = certificates.filter((cert) => {
    if (!cert.expiresAt) return false;
    const expires = new Date(cert.expiresAt);
    return expires.getFullYear() === now.getFullYear() && expires.getMonth() === now.getMonth();
  });
  const empty = unassigned.length + late.length + failed.length + expiring.length === 0;
  return (
    <div className="card shadow-1 radius-8">
      <div className="card-body p-0">
        <div className="d-flex align-items-center justify-content-between px-20 py-16 border-bottom border-neutral-200">
          <h6 className="text-lg mb-0">Your department</h6>
          <Link href="/team" className="text-primary-600 fw-semibold text-sm">
            Team
          </Link>
        </div>
        <div className="p-20 d-flex flex-column gap-3">
          {empty ? <EmptyState message="Nobody in your department needs attention today." /> : null}
          {unassigned.map((person) => (
            <div key={person.userId} className="workiz-attention-row">
              <div className="workiz-attention-row__copy">
                <div className="fw-medium">{personName(person)} has not started</div>
                <div className="text-sm text-secondary-light">No course is assigned.</div>
              </div>
            </div>
          ))}
          {late.map((row) => (
            <div key={`${row.person}-${row.course.title}`} className={`workiz-attention-row${row.course.dueStatus === "overdue" ? " workiz-attention-row--overdue" : ""}`}>
              <div className="workiz-attention-row__copy">
                <div className="fw-medium">{row.person} · {row.course.title}</div>
                <div className="text-sm text-secondary-light">{row.course.dueAt ? `Due ${row.course.dueAt}` : "Due soon"}</div>
              </div>
            </div>
          ))}
          {failed.map((row) => (
            <div key={`quiz-${row.person}-${row.course.title}`} className="workiz-attention-row workiz-attention-row--overdue">
              <div className="workiz-attention-row__copy">
                <div className="fw-medium">{row.person} failed {row.course.title}</div>
                <div className="text-sm text-secondary-light">{row.course.quizScore ?? 0}%</div>
              </div>
            </div>
          ))}
          {expiring.map((cert) => (
            <div key={`${cert.name}-${cert.courseTitle}`} className="workiz-attention-row">
              <div className="workiz-attention-row__copy">
                <div className="fw-medium">{cert.name?.trim() || "A learner"} · {cert.courseTitle}</div>
                <div className="text-sm text-secondary-light">Certificate expires {cert.expiresAt?.slice(0, 10)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
