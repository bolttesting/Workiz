"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { createBrowserSupabase } from "@workix/db/browser";
import { StripeReturnConfirm } from "@/components/StripeReturnConfirm";
import { formatRole } from "@/components/LearnUi";

const web = process.env.NEXT_PUBLIC_WEB_URL ?? "http://localhost:3000";

const links = [
  { href: "/", label: "Dashboard", icon: "ri-home-4-line" },
  { href: "/my-courses", label: "My courses", icon: "ri-play-circle-line" },
  { href: "/catalog", label: "Catalog", icon: "ri-book-2-line" },
  { href: "/certificates", label: "Certificates", icon: "ri-award-line" },
  { href: "/invoices", label: "Invoices", icon: "ri-file-list-3-line" },
  { href: "/account", label: "Account", icon: "ri-user-3-line" },
];

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "L";
  const first = parts[0] ?? "";
  if (parts.length === 1) return first.slice(0, 2).toUpperCase() || "L";
  const second = parts[1] ?? "";
  return `${first.charAt(0)}${second.charAt(0)}`.toUpperCase() || "L";
}

export function LearnShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [name, setName] = useState("Learner");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("individual_learner");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sb = createBrowserSupabase();
    sb.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: profile } = await sb.from("profiles").select("*").eq("id", data.user.id).maybeSingle();
      setName(profile?.full_name || data.user.email || "Learner");
      setEmail(profile?.email || data.user.email || "");
      setRole(profile?.role || "individual_learner");
      setAvatarUrl(profile?.avatar_url || null);
    });
    function onProfile(event: Event) {
      const avatar = (event as CustomEvent<{ avatarUrl?: string | null }>).detail?.avatarUrl;
      if (avatar) setAvatarUrl(avatar);
    }
    window.addEventListener("workix-profile", onProfile);
    return () => window.removeEventListener("workix-profile", onProfile);
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

  const nav = [...links];
  if (role === "instructor" || role === "super_admin") {
    nav.push({ href: "/teach", label: "Teach", icon: "ri-easel-line" });
  }
  if (role === "company_admin" || role === "company_learner") {
    nav.push({ href: "/team", label: "Team", icon: "ri-building-line" });
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
            onClick={() => setCollapsed((v) => !v)}
          >
            <i className={collapsed ? "ri-menu-unfold-line" : "ri-menu-fold-line"} />
          </button>
          <button type="button" className="workiz-sidebar-collapse d-xl-none" aria-label="Close sidebar" onClick={() => setMobileOpen(false)}>
            <i className="ri-close-line" />
          </button>
        </div>
        <div className="sidebar-menu-area">
          <ul className="sidebar-menu" id="sidebar-menu">
            {nav.map((link) => {
              const active =
                link.href === "/"
                  ? pathname === "/"
                  : link.href === "/my-courses"
                    ? pathname === "/my-courses" || pathname.startsWith("/courses/")
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
            <button type="button" className="workiz-topbar__ham d-xl-none" aria-label="Open sidebar" onClick={() => setMobileOpen(true)}>
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
                  <small>{formatRole(role)}</small>
                </span>
                <i className={`ri-arrow-${menuOpen ? "up" : "down"}-s-line workiz-profile__caret`} aria-hidden="true" />
              </button>
              {menuOpen ? (
                <div className="workiz-profile__menu" role="menu">
                  <div className="workiz-profile__menu-head">
                    <strong>{name}</strong>
                    <span>{email || "Signed in"}</span>
                  </div>
                  <Link href="/account" role="menuitem" className="workiz-profile__item" onClick={() => setMenuOpen(false)}>
                    <i className="ri-user-3-line" aria-hidden="true" />
                    Account
                  </Link>
                  <Link href="/catalog" role="menuitem" className="workiz-profile__item" onClick={() => setMenuOpen(false)}>
                    <i className="ri-book-2-line" aria-hidden="true" />
                    Catalog
                  </Link>
                  <a href={web} role="menuitem" className="workiz-profile__item" onClick={() => setMenuOpen(false)}>
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
        <div className="dashboard-main-body">
          <Suspense fallback={null}>
            <StripeReturnConfirm />
          </Suspense>
          {children}
        </div>
      </main>
    </>
  );
}
