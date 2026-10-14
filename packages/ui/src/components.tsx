"use client";

import { useEffect, useId, useRef } from "react";

/*
 * Shared EduDash-shell building blocks for the learn and admin apps.
 * Markup follows the edudash theme classes both apps already load.
 */

export type Tone = "success" | "warning" | "danger" | "info" | "neutral" | "primary";

export function PageHeader({
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
        <h1 className="h6 fw-semibold mb-0">{title}</h1>
        {description ? <p className="text-neutral-600 mt-4 mb-0">{description}</p> : null}
      </div>
      {action ? <div>{action}</div> : null}
    </div>
  );
}

export function DataCard({
  title,
  toolbar,
  footer,
  children,
}: {
  title?: string;
  toolbar?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="card h-100 radius-12 shadow-1">
      {(title || toolbar) && (
        <div className="card-header border-bottom bg-base py-16 px-24 d-flex flex-wrap align-items-center justify-content-between gap-3">
          {title ? <h2 className="h6 text-lg mb-0 fw-semibold">{title}</h2> : <span />}
          {toolbar ? <div className="d-flex flex-wrap align-items-center gap-2">{toolbar}</div> : null}
        </div>
      )}
      <div className="card-body p-24">{children}</div>
      {footer ? <div className="card-footer bg-base border-top py-16 px-24">{footer}</div> : null}
    </div>
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder = "Search…",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="navbar-search mb-0 workiz-search-input">
      <input
        type="search"
        className="bg-transparent"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
      />
      <i className="ri-search-line icon" aria-hidden="true" />
    </div>
  );
}

/** Compact select for table toolbars (status, role, kind…). The first option should be the "all" choice. */
export function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <select
      className="form-select form-select-sm radius-8 w-auto"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={label}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

const TONE_CLASS: Record<Tone, string> = {
  success: "bg-success-100 text-success-600",
  warning: "bg-warning-100 text-warning-600",
  danger: "bg-danger-100 text-danger-600",
  info: "bg-info-100 text-info-600",
  primary: "bg-primary-100 text-primary-600",
  neutral: "bg-neutral-100 text-neutral-600",
};

export function StatusBadge({ label, tone = "neutral" }: { label: string; tone?: Tone }) {
  return <span className={`badge text-sm fw-semibold px-12 py-6 radius-4 ${TONE_CLASS[tone]}`}>{label}</span>;
}

export function EmptyState({ message, action }: { message: string; action?: React.ReactNode }) {
  return (
    <div className="py-24 text-center">
      <p className="text-secondary-light mb-0">{message}</p>
      {action ? <div className="mt-12">{action}</div> : null}
    </div>
  );
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

/** Page numbers to show: first, last, and a window around the current page, with gaps as null. */
function pageWindow(page: number, pageCount: number): Array<number | null> {
  const wanted = new Set([1, pageCount, page - 1, page, page + 1]);
  const pages = [...wanted].filter((p) => p >= 1 && p <= pageCount).sort((a, b) => a - b);
  const out: Array<number | null> = [];
  for (const p of pages) {
    const prev = out[out.length - 1];
    if (typeof prev === "number" && p - prev > 1) out.push(null);
    out.push(p);
  }
  return out;
}

export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  label = "results",
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  label?: string;
}) {
  if (total <= 0) return null;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const first = (page - 1) * pageSize + 1;
  const last = Math.min(total, page * pageSize);
  const button = "page-link radius-8 border-0 px-12 py-6 text-sm fw-medium";

  return (
    <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mt-20 workiz-pagination">
      <p className="text-sm text-secondary-light mb-0" aria-live="polite">
        Showing {first}–{last} of {total} {label}
      </p>
      {pageCount > 1 ? (
        <nav aria-label="Pagination">
          <ul className="pagination d-flex flex-wrap align-items-center gap-1 mb-0">
            <li className={`page-item${page <= 1 ? " disabled" : ""}`}>
              <button
                type="button"
                className={`${button} bg-neutral-200 text-secondary-light`}
                onClick={() => onPageChange(page - 1)}
                disabled={page <= 1}
              >
                Previous
              </button>
            </li>
            {pageWindow(page, pageCount).map((p, i) =>
              p === null ? (
                <li key={`gap-${i}`} className="page-item disabled" aria-hidden="true">
                  <span className={`${button} bg-transparent text-secondary-light`}>…</span>
                </li>
              ) : (
                <li key={p} className={`page-item${p === page ? " active" : ""}`}>
                  <button
                    type="button"
                    className={`${button} ${p === page ? "bg-primary-600 text-white" : "bg-neutral-200 text-secondary-light"}`}
                    onClick={() => onPageChange(p)}
                    aria-current={p === page ? "page" : undefined}
                    aria-label={`Page ${p}`}
                  >
                    {p}
                  </button>
                </li>
              ),
            )}
            <li className={`page-item${page >= pageCount ? " disabled" : ""}`}>
              <button
                type="button"
                className={`${button} bg-neutral-200 text-secondary-light`}
                onClick={() => onPageChange(page + 1)}
                disabled={page >= pageCount}
              >
                Next
              </button>
            </li>
          </ul>
        </nav>
      ) : null}
    </div>
  );
}

export type ConfirmOptions = {
  title: string;
  body?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "primary";
};

/** Centered confirmation dialog in the edudash modal style. Rendered by useConfirm(). */
export function ConfirmDialog({
  options,
  onClose,
}: {
  options: ConfirmOptions;
  onClose: (confirmed: boolean) => void;
}) {
  const titleId = useId();
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    confirmRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose(false);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previous?.focus?.();
    };
  }, [onClose]);

  const danger = options.tone === "danger";
  return (
    <>
      <div className="modal-backdrop fade show" onClick={() => onClose(false)} />
      <div
        className="modal fade show d-block"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => {
          if (event.target === event.currentTarget) onClose(false);
        }}
      >
        <div className="modal-dialog modal-sm modal-dialog-centered max-w-340-px">
          <div className="modal-content radius-16 bg-base">
            <div className="modal-body pt-32 px-36 pb-24 text-center">
              <h2 id={titleId} className="h6 text-lg fw-semibold text-primary-light mb-0">
                {options.title}
              </h2>
              {options.body ? <div className="text-secondary-light text-sm mt-12">{options.body}</div> : null}
              <div className="d-flex align-items-center justify-content-center gap-3 mt-24">
                <button
                  type="button"
                  className="flex-grow-1 btn border border-neutral-300 text-secondary-light text-md px-16 py-11 radius-8"
                  onClick={() => onClose(false)}
                >
                  {options.cancelLabel ?? "Cancel"}
                </button>
                <button
                  ref={confirmRef}
                  type="button"
                  className={`flex-grow-1 btn ${danger ? "btn-danger-600 border-danger-600" : "btn-primary-600 border-primary-600"} border text-md px-16 py-12 radius-8`}
                  onClick={() => onClose(true)}
                >
                  {options.confirmLabel ?? "Confirm"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
