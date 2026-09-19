"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createBrowserSupabase } from "@workix/db/browser";
import {
  Navbar,
  NavBody,
  NavItems,
  MobileNav,
  NavbarLogo,
  NavbarButton,
  MobileNavHeader,
  MobileNavToggle,
  MobileNavMenu,
} from "@/components/ui/resizable-navbar";
import { CartNavLink } from "@/components/CartNavLink";

const learn = process.env.NEXT_PUBLIC_LEARN_URL ?? "http://localhost:3001";
const admin = process.env.NEXT_PUBLIC_ADMIN_URL ?? "http://localhost:3002";

/** Shorter labels so the scrolled pill still fits logo + menu + actions */
const NAV_ITEMS = [
  { name: "Home", link: "/" },
  { name: "Courses", link: "/courses" },
  { name: "About", link: "/about" },
  { name: "FAQ", link: "/faq" },
  { name: "Companies", link: "/pricing" },
  { name: "Contact", link: "/contact" },
];

export function SiteHeader() {
  const [email, setEmail] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const sb = createBrowserSupabase();
    sb.auth.getUser().then(async ({ data }) => {
      setEmail(data.user?.email ?? null);
      if (data.user) {
        const { data: profile } = await sb.from("profiles").select("role").eq("id", data.user.id).maybeSingle();
        setRole(profile?.role ?? null);
      }
    });
  }, []);

  const desktopAuth = email ? (
    <>
      <NavbarButton href={learn} variant="ghost" className="!px-3">
        My learning
      </NavbarButton>
      {role === "instructor" || role === "super_admin" ? (
        <NavbarButton href={`${learn}/teach`} variant="ghost" className="!px-3">
          Teach
        </NavbarButton>
      ) : null}
      {role === "super_admin" ? (
        <NavbarButton href={admin} variant="ghost" className="!px-3">
          Admin
        </NavbarButton>
      ) : null}
    </>
  ) : (
    <>
      <NavbarButton href="/sign-in" variant="ghost" className="!px-3">
        Login
      </NavbarButton>
      <NavbarButton href="/sign-up" variant="secondary" className="!px-4">
        Register
      </NavbarButton>
    </>
  );

  return (
    <div className="workiz-rnav">
      <Navbar>
        <NavBody>
          <NavbarLogo />
          <NavItems items={NAV_ITEMS} />
          <div className="relative z-20 flex shrink-0 items-center gap-1.5">
            <CartNavLink />
            {desktopAuth}
          </div>
        </NavBody>

        <MobileNav>
          <MobileNavHeader>
            <NavbarLogo />
            <div className="flex items-center gap-2">
              <CartNavLink />
              {!email ? (
                <NavbarButton href="/sign-in" variant="ghost" className="!px-3 !py-1.5 text-[15px]">
                  Login
                </NavbarButton>
              ) : null}
              <MobileNavToggle
                isOpen={isMobileMenuOpen}
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              />
            </div>
          </MobileNavHeader>

          <MobileNavMenu isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)}>
            {NAV_ITEMS.map((item, idx) => (
              <Link
                key={`mobile-link-${idx}`}
                href={item.link}
                onClick={() => setIsMobileMenuOpen(false)}
                className="w-full rounded-xl px-3 py-3 text-[17px] font-medium text-[#102846] no-underline transition hover:bg-[#102846]/[0.05]"
              >
                {item.name}
              </Link>
            ))}
            <div className="mt-2 flex w-full flex-col gap-2 border-t border-[#102846]/10 pt-3">
              <Link
                href="/cart"
                onClick={() => setIsMobileMenuOpen(false)}
                className="w-full rounded-xl px-3 py-3 text-[17px] font-medium text-[#102846] no-underline transition hover:bg-[#102846]/[0.05]"
              >
                Cart
              </Link>
              {email ? (
                <>
                  <NavbarButton
                    href={learn}
                    onClick={() => setIsMobileMenuOpen(false)}
                    variant="ghost"
                    className="w-full"
                  >
                    My learning
                  </NavbarButton>
                  {role === "instructor" || role === "super_admin" ? (
                    <NavbarButton
                      href={`${learn}/teach`}
                      onClick={() => setIsMobileMenuOpen(false)}
                      variant="ghost"
                      className="w-full"
                    >
                      Teach
                    </NavbarButton>
                  ) : null}
                  {role === "super_admin" ? (
                    <NavbarButton
                      href={admin}
                      onClick={() => setIsMobileMenuOpen(false)}
                      variant="ghost"
                      className="w-full"
                    >
                      Admin
                    </NavbarButton>
                  ) : null}
                </>
              ) : (
                <NavbarButton
                  href="/sign-up"
                  onClick={() => setIsMobileMenuOpen(false)}
                  variant="secondary"
                  className="w-full"
                >
                  Register
                </NavbarButton>
              )}
            </div>
          </MobileNavMenu>
        </MobileNav>
      </Navbar>
    </div>
  );
}

export function SiteFooter() {
  const year = new Date().getFullYear();
  const [openMenu, setOpenMenu] = useState<string | null>("learn");

  const menus = [
    {
      id: "learn",
      title: "Learn",
      links: [
        { href: "/courses", label: "Courses" },
        { href: "/instructors", label: "Instructors" },
        { href: "/pricing", label: "Company seats" },
        { href: "/blog", label: "Blog" },
      ],
    },
    {
      id: "company",
      title: "Company",
      links: [
        { href: "/about", label: "About" },
        { href: "/faq", label: "FAQ" },
        { href: "/contact", label: "Contact Us" },
        { href: "/sign-in", label: "Sign in" },
        { href: "/sign-up", label: "Register" },
      ],
    },
    {
      id: "legal",
      title: "Legal",
      links: [
        { href: "/privacy", label: "Privacy Policy" },
        { href: "/terms", label: "Terms of Service" },
        { href: "/cookies", label: "Cookie Policy" },
      ],
    },
  ] as const;

  function toggleMenu(id: string) {
    setOpenMenu((current) => (current === id ? null : id));
  }

  const copy = (
    <>
      © {year} <Link href="/">WORKIZ</Link>. All Rights reserved. Designed and Developed by{" "}
      <a href="https://logixcontact.com/" target="_blank" rel="noopener noreferrer">
        Logix Contact
      </a>
    </>
  );

  const socials = (
    <ul>
      <li>
        <a href="#" aria-label="Facebook">
          <i className="fab fa-facebook-f" />
        </a>
      </li>
      <li>
        <a href="#" aria-label="X">
          <i className="fa-brands fa-x-twitter" />
        </a>
      </li>
      <li>
        <a href="#" aria-label="LinkedIn">
          <i className="fab fa-linkedin-in" />
        </a>
      </li>
      <li>
        <a href="#" aria-label="Pinterest">
          <i className="fab fa-pinterest-p" />
        </a>
      </li>
    </ul>
  );

  return (
    <>
      {/* Desktop: original multi-column footer */}
      <div className="footer-area workiz-footer-desktop">
        <div className="container">
          <div className="row subscribe align-items-center">
            <div className="col-lg-4 col-md-12">
              <div className="footer-logo">
                <Link href="/" className="workiz-lockup">
                  <img src="/assets/images/home-one/footer-logo.png" alt="" />
                  <span className="workiz-wordmark">WORKIZ</span>
                </Link>
              </div>
            </div>
            <div className="col-lg-4 col-md-12">
              <div className="footer-subcribe-title">
                <h3>
                  SUBSCRIBE <span>NEWSLETTER</span>
                </h3>
              </div>
            </div>
            <div className="col-lg-4 col-md-12">
              <form action="/contact">
                <div className="subscribe-box">
                  <span>
                    <i className="fa-classic fa-regular fa-envelope fa-fw" />
                  </span>
                  <input type="email" name="Email" placeholder="Enter Your Email" required />
                  <button type="submit" aria-label="Subscribe">
                    <span>
                      <i className="fa-classic fa-solid fa-location-arrow fa-fw" />
                    </span>
                  </button>
                </div>
              </form>
            </div>
          </div>
          <div className="row add-footer-class">
            <div className="col-xl-4 col-lg-4 col-md-6">
              <div className="footer-widget-content">
                <div className="footer-desc">
                  <p>
                    WORKIZ is professional online training from Workiz Support Solutions - FZCO (Dubai). Company admins
                    create employee accounts and assign courses across departments.
                  </p>
                </div>
              </div>
            </div>
            <div className="col-xl-3 col-lg-3 col-md-6">
              <div className="footer-widget-content">
                <div className="footer-widget-title">
                  <h4>Platform</h4>
                </div>
                <div className="footer-widget-menu">
                  <ul>
                    <li>
                      <Link href="/courses">Courses</Link>
                    </li>
                    <li>
                      <Link href="/instructors">Instructors</Link>
                    </li>
                    <li>
                      <Link href="/pricing">Company seats</Link>
                    </li>
                    <li>
                      <Link href="/sign-in">Sign in</Link>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
            <div className="col-xl-2 col-lg-2 col-md-6">
              <div className="footer-widget-content">
                <div className="footer-widget-title">
                  <h4>Quick Links</h4>
                </div>
                <div className="footer-widget-menu">
                  <ul>
                    <li>
                      <Link href="/about">About</Link>
                    </li>
                    <li>
                      <Link href="/faq">FAQ</Link>
                    </li>
                    <li>
                      <Link href="/contact">Contact Us</Link>
                    </li>
                    <li>
                      <Link href="/sign-up">Register</Link>
                    </li>
                    <li>
                      <Link href="/blog">Blog</Link>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
            <div className="col-xl-3 col-lg-3 col-md-6">
              <div className="footer-widget-content">
                <div className="footer-widget-title">
                  <h4>Legal</h4>
                </div>
                <div className="footer-widget-menu">
                  <ul>
                    <li>
                      <Link href="/privacy">Privacy Policy</Link>
                    </li>
                    <li>
                      <Link href="/terms">Terms of Service</Link>
                    </li>
                    <li>
                      <Link href="/cookies">Cookie Policy</Link>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="footer-bottom-area">
          <div className="container">
            <div className="row footer-bottom">
              <div className="col-lg-6">
                <div className="footer-bottom-desc">
                  <p>{copy}</p>
                </div>
              </div>
              <div className="col-lg-6">
                <div className="footer-bottom-social-icon">{socials}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile: centered brand + accordion menus */}
      <footer className="workiz-footer workiz-footer-mobile">
        <div className="container">
          <div className="workiz-footer__subscribe">
            <div className="workiz-footer__subscribe-title">
              SUBSCRIBE <span>NEWSLETTER</span>
            </div>
            <form className="workiz-footer__subscribe-form" action="/contact">
              <span className="workiz-footer__subscribe-icon" aria-hidden="true">
                <i className="fa-classic fa-regular fa-envelope fa-fw" />
              </span>
              <input type="email" name="Email" placeholder="Enter Your Email" required />
              <button type="submit" aria-label="Subscribe">
                <i className="fa-classic fa-solid fa-location-arrow fa-fw" />
              </button>
            </form>
          </div>

          <div className="workiz-footer__brand">
            <Link href="/" className="workiz-footer__logo-link">
              <img src="/assets/images/home-one/footer-logo.png" alt="WORKIZ" className="workiz-footer__logo" />
              <span className="workiz-footer__name">WORKIZ</span>
            </Link>
            <p className="workiz-footer__tagline">Learn. Develop. Grow.</p>
            <p className="workiz-footer__blurb">
              Professional online training from Workiz Support Solutions - FZCO, Dubai. Company admins create employee
              accounts and assign courses across departments.
            </p>
          </div>

          <div className="workiz-footer__menus">
            {menus.map((menu) => {
              const isOpen = openMenu === menu.id;
              return (
                <div key={menu.id} className={`workiz-footer__menu${isOpen ? " is-open" : ""}`}>
                  <button
                    type="button"
                    className="workiz-footer__menu-toggle"
                    aria-expanded={isOpen}
                    onClick={() => toggleMenu(menu.id)}
                  >
                    <span>{menu.title}</span>
                    <i className={`fa-solid fa-chevron-${isOpen ? "up" : "down"}`} aria-hidden="true" />
                  </button>
                  <ul className="workiz-footer__menu-list" hidden={!isOpen}>
                    {menu.links.map((link) => (
                      <li key={link.href}>
                        <Link href={link.href}>{link.label}</Link>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>

          <div className="workiz-footer__social">
            <a href="#" aria-label="Facebook">
              <i className="fab fa-facebook-f" />
            </a>
            <a href="#" aria-label="X">
              <i className="fa-brands fa-x-twitter" />
            </a>
            <a href="#" aria-label="LinkedIn">
              <i className="fab fa-linkedin-in" />
            </a>
            <a href="#" aria-label="Pinterest">
              <i className="fab fa-pinterest-p" />
            </a>
          </div>

          <p className="workiz-footer__copy">{copy}</p>
        </div>
      </footer>
    </>
  );
}

export function Breadcrumb({ title, crumb }: { title: string; crumb: string }) {
  return (
    <div className="breadcumb-area workiz-breadcrumb d-flex">
      <div className="container">
        <div className="row align-items-center">
          <div className="col-lg-12">
            <div className="breadcumb-content text-center">
              <div className="breadcumb-title">
                <h4>{title}</h4>
              </div>
              <ul>
                <li>
                      <Link href="/">
                    Home{" "}
                    <span>
                      <i className="fa-solid fa-arrow-right-long" />
                    </span>
                  </Link>
                </li>
                <li>{crumb}</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
