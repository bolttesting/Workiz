import Link from "next/link";
import type { ReactNode } from "react";

type AuthShellProps = {
  title: string;
  subtitle: string;
  brandHeadline: string;
  brandBody: string;
  children: ReactNode;
  switchPrompt: string;
  switchHref: string;
  switchLabel: string;
};

export function AuthShell({
  title,
  subtitle,
  brandHeadline,
  brandBody,
  children,
  switchPrompt,
  switchHref,
  switchLabel,
}: AuthShellProps) {
  return (
    <div className="workiz-auth">
      <aside className="workiz-auth__brand">
        <div className="workiz-auth__brand-glow" aria-hidden="true" />
        <div className="workiz-auth__brand-inner">
          <Link href="/" className="workiz-auth__brand-logo">
            <img src="/assets/images/logo.png" alt="WORKIZ" />
            <span>WORKIZ</span>
          </Link>
          <h1 className="workiz-auth__brand-title">{brandHeadline}</h1>
          <p className="workiz-auth__brand-body">{brandBody}</p>
          <ul className="workiz-auth__perks">
            <li>Professional courses for company teams</li>
            <li>Admins create users and assign training</li>
            <li>Progress tracked across departments</li>
          </ul>
        </div>
      </aside>

      <main className="workiz-auth__panel">
        <div className="workiz-auth__panel-top">
          <Link href="/" className="workiz-auth__back">
            ← Back to home
          </Link>
          <Link href="/" className="workiz-auth__mobile-logo">
            <img src="/assets/images/logo.png" alt="WORKIZ" />
          </Link>
        </div>

        <div className="workiz-auth__card">
          <header className="workiz-auth__header">
            <h2 className="workiz-auth__title">{title}</h2>
            <p className="workiz-auth__subtitle">{subtitle}</p>
          </header>
          {children}
          <p className="workiz-auth__switch">
            {switchPrompt}{" "}
            <Link href={switchHref} className="workiz-auth__link">
              {switchLabel}
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
