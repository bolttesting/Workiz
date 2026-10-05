"use client";

export function LearnPageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="breadcrumb d-flex flex-wrap align-items-center justify-content-between gap-3 mb-24">
      <div>
        <h6 className="fw-semibold mb-0">{title}</h6>
        {description ? <p className="text-neutral-600 mt-4 mb-0">{description}</p> : null}
      </div>
      {action ? <div>{action}</div> : null}
    </div>
  );
}

export function LearnDataCard({
  title,
  toolbar,
  children,
}: {
  title?: string;
  toolbar?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="card h-100 radius-12 shadow-1">
      {(title || toolbar) && (
        <div className="card-header border-bottom bg-base py-16 px-24 d-flex flex-wrap align-items-center justify-content-between gap-3">
          {title ? <h6 className="text-lg mb-0 fw-semibold">{title}</h6> : <span />}
          {toolbar}
        </div>
      )}
      <div className="card-body p-24">{children}</div>
    </div>
  );
}

export function StatusBadge({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: "success" | "warning" | "danger" | "info" | "neutral" | "primary";
}) {
  const map: Record<string, string> = {
    success: "bg-success-100 text-success-600",
    warning: "bg-warning-100 text-warning-600",
    danger: "bg-danger-100 text-danger-600",
    info: "bg-info-100 text-info-600",
    primary: "bg-primary-100 text-primary-600",
    neutral: "bg-neutral-100 text-neutral-600",
  };
  return <span className={`badge text-sm fw-semibold px-12 py-6 radius-4 ${map[tone]}`}>{label}</span>;
}

export function EmptyState({ message }: { message: string }) {
  return <p className="text-secondary-light mb-0 py-24 text-center">{message}</p>;
}

export function LoadingState({ message = "Loading…", rows = 5 }: { message?: string; rows?: number }) {
  return (
    <div role="status" aria-live="polite" aria-busy="true">
      <span className="visually-hidden">{message}</span>
      <div className="workiz-admin-table-wrap">
        <table className="table bordered-table mb-0">
          <tbody>
            {Array.from({ length: rows }, (_, row) => (
              <tr key={row}>
                <td>
                  <span className="workiz-bone workiz-bone--cell" />
                </td>
                <td>
                  <span className="workiz-bone workiz-bone--chip" />
                </td>
                <td>
                  <span className="workiz-bone workiz-bone--chip" />
                </td>
                <td>
                  <span className="workiz-bone workiz-bone--meta" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function formatRole(role: string) {
  return role.replaceAll("_", " ");
}
