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
          <div className="relative z-20 flex shrink-0 items-center gap-1.5">{desktopAuth}</div>
        </NavBody>

        <MobileNav>
          <MobileNavHeader>
            <NavbarLogo />
            <div className="flex items-center gap-2">
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
  return (
    <div className="footer-area">
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
                <input type="text" name="Email" placeholder="Enter Your Email" />
                <button type="submit">
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
                    <img src="/assets/images/home-one/footer-icon.png" alt="" />
                    <Link href="/courses">Courses</Link>
                  </li>
                  <li>
                    <img src="/assets/images/home-one/footer-icon.png" alt="" />
                    <Link href="/instructors">Instructors</Link>
                  </li>
                  <li>
                    <img src="/assets/images/home-one/footer-icon.png" alt="" />
                    <Link href="/pricing">Company seats</Link>
                  </li>
                  <li>
                    <img src="/assets/images/home-one/footer-icon.png" alt="" />
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
                    <img src="/assets/images/home-one/footer-icon.png" alt="" />
                    <Link href="/about">About</Link>
                  </li>
                  <li>
                    <img src="/assets/images/home-one/footer-icon.png" alt="" />
                    <Link href="/faq">FAQ</Link>
                  </li>
                  <li>
                    <img src="/assets/images/home-one/footer-icon.png" alt="" />
                    <Link href="/contact">Contact Us</Link>
                  </li>
                  <li>
                    <img src="/assets/images/home-one/footer-icon.png" alt="" />
                    <Link href="/sign-up">Register</Link>
                  </li>
                  <li>
                    <img src="/assets/images/home-one/footer-icon.png" alt="" />
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
                    <img src="/assets/images/home-one/footer-icon.png" alt="" />
                    <Link href="/privacy">Privacy Policy</Link>
                  </li>
                  <li>
                    <img src="/assets/images/home-one/footer-icon.png" alt="" />
                    <Link href="/terms">Terms of Service</Link>
                  </li>
                  <li>
                    <img src="/assets/images/home-one/footer-icon.png" alt="" />
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
                <p>
                  © {new Date().getFullYear()} <Link href="/">WORKIZ</Link>. All Rights reserved. Designed and Developed by
                  Logix Contact
                </p>
              </div>
            </div>
            <div className="col-lg-6">
              <div className="footer-bottom-social-icon">
                <ul>
                  <li>
                    <a href="#">
                      <i className="fab fa-facebook-f" />
                    </a>
                  </li>
                  <li>
                    <a href="#">
                      <i className="fa-brands fa-x-twitter" />
                    </a>
                  </li>
                  <li>
                    <a href="#">
                      <i className="fab fa-linkedin-in" />
                    </a>
                  </li>
                  <li>
                    <a href="#">
                      <i className="fab fa-pinterest-p" />
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
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
