"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createBrowserSupabase } from "@workix/db/browser";
import { useEffect, useState } from "react";

const web = process.env.NEXT_PUBLIC_WEB_URL ?? "http://localhost:3000";

const links = [
  { href: "/", label: "My courses", icon: "ri-play-circle-line" },
  { href: "/catalog", label: "Catalog", icon: "ri-book-2-line" },
  { href: "/certificates", label: "Certificates", icon: "ri-award-line" },
  { href: "/invoices", label: "Invoices", icon: "ri-file-list-3-line" },
  { href: "/account", label: "Account", icon: "ri-user-3-line" },
];

export function LearnShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [name, setName] = useState("Learner");
  const [role, setRole] = useState<string>("individual_learner");

  useEffect(() => {
    const sb = createBrowserSupabase();
    sb.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: profile } = await sb.from("profiles").select("*").eq("id", data.user.id).maybeSingle();
      setName(profile?.full_name || data.user.email || "Learner");
      setRole(profile?.role || "individual_learner");
    });
  }, []);

  async function logout() {
    const sb = createBrowserSupabase();
    await sb.auth.signOut();
    window.location.href = `${web}/`;
  }

  return (
    <>
      <aside className="sidebar">
        <div className="sidebar-logo d-flex align-items-center justify-content-between">
          <a href={web}>
            <img src="/assets/images/logo.png" alt="Workiz" className="light-logo" />
            <img src="/assets/images/logo-light.png" alt="Workiz" className="dark-logo" />
            <img src="/assets/images/logo-icon.png" alt="Workiz" className="logo-icon" />
          </a>
        </div>
        <div className="mx-16 py-12">
          <div className="p-10 bg-neutral-50 radius-12">
            <span className="h6 mb-0 d-block">{name}</span>
            <span className="text-sm text-secondary-light">{role.replaceAll("_", " ")}</span>
          </div>
        </div>
        <div className="sidebar-menu-area">
          <ul className="sidebar-menu">
            {links.map((link) => (
              <li key={link.href} className={pathname === link.href ? "active-page" : ""}>
                <Link href={link.href}>
                  <i className={link.icon} />
                  <span>{link.label}</span>
                </Link>
              </li>
            ))}
            {(role === "instructor" || role === "super_admin") && (
              <li className={pathname.startsWith("/teach") ? "active-page" : ""}>
                <Link href="/teach">
                  <i className="ri-easel-line" />
                  <span>Teach</span>
                </Link>
              </li>
            )}
            {(role === "company_admin" || role === "company_learner") && (
              <li className={pathname === "/team" ? "active-page" : ""}>
                <Link href="/team">
                  <i className="ri-building-line" />
                  <span>Team</span>
                </Link>
              </li>
            )}
          </ul>
        </div>
      </aside>
      <main className="dashboard-main">
        <div className="navbar-header shadow-1">
          <div className="row align-items-center justify-content-between">
            <div className="col-auto">
              <h6 className="mb-0">Workiz Learn</h6>
            </div>
            <div className="col-auto d-flex gap-3">
              <a href={`${web}/courses`} className="btn btn-outline-primary-600 radius-8 px-16 py-8">
                Browse catalog
              </a>
              <button type="button" className="btn btn-outline-danger-600 radius-8 px-16 py-8" onClick={logout}>
                Log out
              </button>
            </div>
          </div>
        </div>
        <div className="dashboard-main-body">{children}</div>
      </main>
    </>
  );
}
