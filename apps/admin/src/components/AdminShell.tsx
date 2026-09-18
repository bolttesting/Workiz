"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createBrowserSupabase } from "@workix/db/browser";

const web = process.env.NEXT_PUBLIC_WEB_URL ?? "http://localhost:3000";

const links = [
  { href: "/", label: "Dashboard", icon: "ri-home-4-line" },
  { href: "/courses", label: "Courses", icon: "ri-graduation-cap-line" },
  { href: "/instructors", label: "Instructors", icon: "ri-user-star-line" },
  { href: "/users", label: "Users", icon: "ri-user-3-line" },
  { href: "/organizations", label: "Companies", icon: "ri-building-line" },
  { href: "/orders", label: "Orders", icon: "ri-shopping-cart-line" },
  { href: "/invoices", label: "Invoices", icon: "ri-file-list-3-line" },
  { href: "/settings", label: "Settings", icon: "ri-settings-3-line" },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  async function logout() {
    await createBrowserSupabase().auth.signOut();
    window.location.href = `${web}/`;
  }

  return (
    <>
      <aside className="sidebar">
        <div className="sidebar-logo">
          <a href={web}>
            <img src="/assets/images/logo.png" alt="Workiz" className="light-logo" />
            <img src="/assets/images/logo-light.png" alt="Workiz" className="dark-logo" />
            <img src="/assets/images/logo-icon.png" alt="Workiz" className="logo-icon" />
          </a>
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
          </ul>
        </div>
      </aside>
      <main className="dashboard-main">
        <div className="navbar-header shadow-1">
          <div className="row align-items-center justify-content-between">
            <div className="col-auto">
              <h6 className="mb-0">Workiz Admin</h6>
            </div>
            <div className="col-auto">
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
