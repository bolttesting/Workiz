"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createBrowserSupabase } from "@workix/db/browser";
import { useEffect, useRef, useState } from "react";

const web = process.env.NEXT_PUBLIC_WEB_URL ?? "http://localhost:3000";

const links = [
  { href: "/", label: "Dashboard", icon: "ri-home-4-line" },
  { href: "/courses", label: "Courses", icon: "ri-graduation-cap-line" },
  { href: "/questions", label: "Questions", icon: "ri-question-answer-line" },
  { href: "/blog", label: "Blog", icon: "ri-article-line" },
  { href: "/instructors", label: "Instructors", icon: "ri-user-star-line" },
  { href: "/users", label: "Users", icon: "ri-user-3-line" },
  { href: "/organizations", label: "Companies", icon: "ri-building-line" },
  { href: "/orders", label: "Orders", icon: "ri-shopping-cart-line" },
  { href: "/invoices", label: "Invoices", icon: "ri-file-list-3-line" },
  { href: "/settings", label: "Settings", icon: "ri-settings-3-line" },
];

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "A";
  const first = parts[0] ?? "";
  if (parts.length === 1) return first.slice(0, 2).toUpperCase() || "A";
  const second = parts[1] ?? "";
  return `${first.charAt(0)}${second.charAt(0)}`.toUpperCase() || "A";
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [name, setName] = useState("Admin");
  const [email, setEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sb = createBrowserSupabase();
    sb.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: profile } = await sb
        .from("profiles")
        .select("full_name,email,avatar_url")
        .eq("id", data.user.id)
        .maybeSingle();
      setName(profile?.full_name || data.user.email || "Admin");
      setEmail(profile?.email || data.user.email || "");
      setAvatarUrl(profile?.avatar_url || null);
    });
  }, []);

  useEffect(() => {
    setMenuOpen(false);
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setMenuOpen(false);
        setMobileOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  useEffect(() => {
    document.body.classList.toggle("overlay-active", mobileOpen);
    return () => document.body.classList.remove("overlay-active");
  }, [mobileOpen]);

  async function logout() {
    await createBrowserSupabase().auth.signOut();
    window.location.href = `${web}/`;
  }

  function toggleCollapsed() {
    setCollapsed((v) => !v);
  }

  return (
    <>
      <div className="body-overlay" onClick={() => setMobileOpen(false)} />
      <aside className={`sidebar${collapsed ? " active" : ""}${mobileOpen ? " sidebar-open" : ""}`}>
        <div className="workiz-sidebar-top">
          <Link href="/" className="workiz-sidebar-brand" title="WORKIZ" onClick={() => setMobileOpen(false)}>
            <img src="/assets/images/logo-icon.png" alt="" className="workiz-sidebar-brand__mark" />
            <span className="workiz-sidebar-brand__name">WORKIZ</span>
          </Link>
          <button
            type="button"
            className="workiz-sidebar-collapse d-none d-xl-inline-flex"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-pressed={collapsed}
            onClick={toggleCollapsed}
          >
            <i className={collapsed ? "ri-menu-unfold-line" : "ri-menu-fold-line"} />
          </button>
          <button
            type="button"
            className="workiz-sidebar-collapse d-xl-none"
            aria-label="Close sidebar"
            onClick={() => setMobileOpen(false)}
          >
            <i className="ri-close-line" />
          </button>
        </div>

        <div className="sidebar-menu-area">
          <ul className="sidebar-menu" id="sidebar-menu">
            {links.map((link) => {
              const active =
                link.href === "/"
                  ? pathname === "/"
                  : pathname === link.href || pathname.startsWith(`${link.href}/`);
              return (
                <li key={link.href} className={active ? "active-page" : ""}>
                  <Link href={link.href} onClick={() => setMobileOpen(false)} title={link.label}>
                    <i className={link.icon} />
                    <span>{link.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </aside>

      <main className={`dashboard-main${collapsed ? " active" : ""}`}>
        <header className="navbar-header workiz-topbar shadow-1">
          <div className="workiz-topbar__left">
            <button
              type="button"
              className="workiz-topbar__ham d-xl-none"
              aria-label="Open sidebar"
              onClick={() => setMobileOpen(true)}
            >
              <i className="ri-menu-line" />
            </button>
          </div>

          <div className="workiz-topbar__right">
            <div className="workiz-profile" ref={menuRef}>
              <button
                type="button"
                className="workiz-profile__btn"
                aria-expanded={menuOpen}
                aria-haspopup="menu"
                onClick={() => setMenuOpen((v) => !v)}
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" className="workiz-profile__avatar" />
                ) : (
                  <span className="workiz-profile__avatar workiz-profile__avatar--fallback" aria-hidden="true">
                    {initials(name)}
                  </span>
                )}
                <span className="workiz-profile__meta d-none d-sm-flex">
                  <strong>{name}</strong>
                  <small>{email || "Super admin"}</small>
                </span>
                <i className={`ri-arrow-${menuOpen ? "up" : "down"}-s-line workiz-profile__caret`} aria-hidden="true" />
              </button>

              {menuOpen ? (
                <div className="workiz-profile__menu" role="menu">
                  <div className="workiz-profile__menu-head">
                    <strong>{name}</strong>
                    <span>{email || "Signed in"}</span>
                  </div>
                  <Link href="/settings" role="menuitem" className="workiz-profile__item" onClick={() => setMenuOpen(false)}>
                    <i className="ri-settings-3-line" aria-hidden="true" />
                    Settings
                  </Link>
                  <Link href="/courses" role="menuitem" className="workiz-profile__item" onClick={() => setMenuOpen(false)}>
                    <i className="ri-graduation-cap-line" aria-hidden="true" />
                    Courses
                  </Link>
                  <a
                    href={web}
                    role="menuitem"
                    className="workiz-profile__item"
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => setMenuOpen(false)}
                  >
                    <i className="ri-global-line" aria-hidden="true" />
                    View website
                  </a>
                  <button type="button" role="menuitem" className="workiz-profile__item workiz-profile__item--danger" onClick={logout}>
                    <i className="ri-logout-box-r-line" aria-hidden="true" />
                    Log out
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        <div className="dashboard-main-body">{children}</div>
      </main>
    </>
  );
}
