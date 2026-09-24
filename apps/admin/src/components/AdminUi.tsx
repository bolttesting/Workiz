"use client";

export function AdminPageHeader({
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

export function AdminSearchInput({
  value,
  onChange,
  placeholder = "Search…",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="navbar-search mb-0" style={{ maxWidth: 280 }}>
      <input
        type="search"
        className="bg-transparent"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
      />
      <i className="ri-search-line icon" />
    </div>
  );
}

export function AdminDataCard({
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
  return (
    <span className={`badge text-sm fw-semibold px-12 py-6 radius-4 ${map[tone]}`}>
      {label}
    </span>
  );
}

export function EmptyState({ message }: { message: string }) {
  return <p className="text-secondary-light mb-0 py-24 text-center">{message}</p>;
}

export function LoadingState({ message = "Loading…" }: { message?: string }) {
  return <p className="text-secondary-light mb-0 py-24 text-center">{message}</p>;
}

export function formatRole(role: string) {
  return role.replaceAll("_", " ");
}

export function matchesQuery(query: string, values: Array<string | null | undefined>) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return values.some((v) => (v ?? "").toLowerCase().includes(q));
}
