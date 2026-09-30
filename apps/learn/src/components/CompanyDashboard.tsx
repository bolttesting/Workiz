import Link from "next/link";
import { formatMoney } from "@workix/config";
import { EmptyState, StatusBadge } from "@/components/LearnUi";

export type CompanyMember = { id: string; email: string; full_name: string | null; role: string };
export type CompanyInvite = { id: string; email: string; status: string };
export type CompanyCourse = {
  title: string;
  status: string;
  dueAt: string | null;
  dueStatus: string;
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

function personName(row: { name: string | null; email: string }) {
  return row.name?.trim() || row.email;
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
  const attention = [...overdue, ...dueSoon].slice(0, 8);
  const mix = [
    { label: "Overdue", count: overdue.length, color: "bg-danger-600" },
    { label: "Due soon", count: dueSoon.length, color: "bg-warning-600" },
    { label: "On track", count: Math.max(0, onTrack), color: "bg-success-600" },
  ];
  const mixTotal = Math.max(assignments.length, 1);
  const lede = overdue.length
    ? `${overdue.length} assigned course${overdue.length === 1 ? " is" : "s are"} overdue.`
    : dueSoon.length
      ? `${dueSoon.length} course${dueSoon.length === 1 ? " is" : "s are"} due soon.`
      : "Nobody is late.";

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

      <div className="card shadow-1 radius-8">
        <div className="card-body p-0">
          <div className="d-flex flex-wrap align-items-center justify-content-between px-20 py-16 border-bottom border-neutral-200">
            <h6 className="text-lg mb-0">Needs attention</h6>
            <Link href="/team" className="text-primary-600 fw-semibold text-sm">
              Team
            </Link>
          </div>
          <div className="p-20">
            {attention.length === 0 ? (
              <EmptyState message="Nobody is overdue or due soon." />
            ) : (
              <div className="workiz-admin-table-wrap">
                <table className="table workiz-dash-table mb-0">
                  <thead>
                    <tr>
                      <th>Person</th>
                      <th>Course</th>
                      <th>Due</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attention.map((row) => {
                      const badge = dueLabel(row.dueStatus);
                      return (
                        <tr key={row.key}>
                          <td>
                            <div className="fw-medium">{row.person}</div>
                            {row.department ? <div className="text-sm text-secondary-light">{row.department}</div> : null}
                          </td>
                          <td>{row.course}</td>
                          <td>{row.dueAt || "—"}</td>
                          <td>
                            <StatusBadge label={badge.label} tone={badge.tone} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
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
                {company.activity.slice(0, 6).map((event) => (
                  <li key={event.id} className="d-flex flex-wrap justify-content-between gap-2">
                    <span>
                      <span className="fw-medium text-primary-light">{event.actorName || "Someone"}</span> {event.action.toLowerCase()}
                      {event.detail ? <span className="text-secondary-light"> · {event.detail}</span> : null}
                    </span>
                    <span className="text-sm text-secondary-light">{event.createdAt.slice(0, 10)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
