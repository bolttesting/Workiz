"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { formatMoney } from "@workix/config";
import { ArrowUpRight, Building2, Trash2 } from "lucide-react";
import { createBrowserSupabase } from "@workix/db/browser";
import { useSeatsCart } from "@/lib/seats-cart";
import { apiClient } from "@/lib/api";

type AuthMode = "signup" | "signin";

export function SeatsCheckout() {
  const searchParams = useSearchParams();
  const { selection, clear, updateCompanyName } = useSeatsCart();
  const [hydrated, setHydrated] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [authedEmail, setAuthedEmail] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("signup");
  const [authLoading, setAuthLoading] = useState(false);
  const wantsCheckout = searchParams.get("checkout") === "1";

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (selection?.companyName) setCompanyName(selection.companyName);
  }, [selection?.companyName]);

  useEffect(() => {
    const sb = createBrowserSupabase();
    sb.auth.getUser().then(({ data }) => {
      setAuthedEmail(data.user?.email ?? null);
      setAuthReady(true);
    });
  }, []);

  async function startCheckout() {
    if (!selection) return;
    const name = companyName.trim();
    if (name.length < 2) {
      setError("Enter your company name to continue.");
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const { url } = await apiClient<{ url: string }>("/checkout/seats", {
        method: "POST",
        body: JSON.stringify({ companyName: name, seats: selection.seats }),
      });
      clear();
      window.location.href = url;
    } catch (err) {
      const text = (err as Error).message;
      if (text.toLowerCase().includes("unauthorized")) {
        setAuthedEmail(null);
        setAuthMode("signup");
        setError("Create a company account or sign in to complete checkout.");
        setLoading(false);
        return;
      }
      setError(text);
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!authReady || !wantsCheckout || !authedEmail || !selection || loading) return;
    const url = new URL(window.location.href);
    url.searchParams.delete("checkout");
    window.history.replaceState({}, "", url.pathname + url.search);
    void startCheckout();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authReady, wantsCheckout, authedEmail, selection?.seats]);

  async function handleAuth(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthLoading(true);
    setError(null);
    setMessage(null);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const fullName = String(formData.get("fullName") ?? "").trim();
    const company = String(formData.get("companyName") ?? companyName).trim();
    const sb = createBrowserSupabase();

    if (company.length < 2) {
      setError("Enter your company name to continue.");
      setAuthLoading(false);
      return;
    }

    setCompanyName(company);
    updateCompanyName(company);

    try {
      if (authMode === "signup") {
        const { data, error: err } = await sb.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              company_name: company,
              intended_role: "company_admin",
            },
          },
        });
        if (err) throw err;
        if (!data.session) {
          setMessage("Check your email to confirm your account, then sign in here to checkout.");
          setAuthMode("signin");
          setAuthLoading(false);
          return;
        }
        setAuthedEmail(data.session.user.email ?? email);
      } else {
        const { data, error: err } = await sb.auth.signInWithPassword({ email, password });
        if (err) throw err;
        setAuthedEmail(data.user.email ?? email);
      }
      setAuthLoading(false);
      await startCheckout();
    } catch (err) {
      setError((err as Error).message);
      setAuthLoading(false);
    }
  }

  async function checkout() {
    if (!selection) return;
    if (!authedEmail) {
      setError("Create a company account or sign in to complete checkout.");
      return;
    }
    await startCheckout();
  }

  if (!hydrated) {
    return (
      <section className="workiz-cart">
        <div className="container">
          <p className="workiz-cart__lede">Loading cart…</p>
        </div>
      </section>
    );
  }

  if (!selection) {
    return (
      <section className="workiz-cart">
        <div className="container">
          <div className="workiz-cart__intro">
            <p className="workiz-cart__eyebrow">COMPANY SEATS</p>
            <h1 className="workiz-cart__title">No seats selected</h1>
            <p className="workiz-cart__lede">
              Choose a company package, then come back here to create your admin account and pay.
            </p>
          </div>
          <div className="workiz-cart__empty">
            <Building2 size={28} strokeWidth={1.8} aria-hidden="true" />
            <h2>Pick a seat package</h2>
            <p>Starter, Growth, or Custom — then checkout as your company.</p>
            <Link href="/pricing" className="workiz-cart__primary">
              View company packages
              <ArrowUpRight size={16} strokeWidth={2.4} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>
    );
  }

  const perSeat = formatMoney(selection.pricePerSeatCents);
  const total = formatMoney(selection.monthlyCents);

  return (
    <section className="workiz-cart">
      <div className="container">
        <div className="workiz-cart__intro">
          <p className="workiz-cart__eyebrow">COMPANY SEATS</p>
          <h1 className="workiz-cart__title">Company checkout</h1>
          <p className="workiz-cart__lede">
            Enter your company name, then register or sign in to pay with Stripe.
          </p>
        </div>

        <div className="workiz-cart__layout">
          <div className="workiz-cart__list">
            <article className="workiz-cart__row workiz-cart__row--seats">
              <div className="workiz-cart__seats-icon" aria-hidden="true">
                <Building2 size={28} strokeWidth={1.8} />
              </div>
              <div className="workiz-cart__copy">
                <h2>{selection.planName} plan</h2>
                <p>
                  {selection.seats} learner seats · {perSeat} per user / month
                </p>
                <button type="button" className="workiz-cart__remove" onClick={() => clear()}>
                  <Trash2 size={14} strokeWidth={2.2} aria-hidden="true" />
                  Remove
                </button>
              </div>
              <strong className="workiz-cart__price">{total}/mo</strong>
            </article>
          </div>

          <aside className="workiz-cart__summary">
            <h2>Order summary</h2>
            <div className="workiz-cart__summary-row">
              <span>
                {selection.seats} seats · {selection.planName}
              </span>
              <strong>{total}/mo</strong>
            </div>
            <p className="workiz-cart__summary-note">
              Billed monthly via Stripe. Your company admin creates employee accounts and assigns courses.
            </p>

            <label className="workiz-cart__company-field">
              Company name
              <input
                type="text"
                value={companyName}
                onChange={(e) => {
                  setCompanyName(e.target.value);
                  updateCompanyName(e.target.value);
                }}
                required
                minLength={2}
                placeholder="Acme Training LLC"
                autoComplete="organization"
              />
            </label>

            {authReady && !authedEmail ? (
              <div className="workiz-cart__auth">
                <form className="workiz-cart__auth-form" onSubmit={handleAuth}>
                  {authMode === "signup" ? (
                    <label>
                      Admin full name
                      <input name="fullName" type="text" autoComplete="name" required placeholder="Your name" />
                    </label>
                  ) : null}
                  <input type="hidden" name="companyName" value={companyName} />
                  <label>
                    Work email
                    <input
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      placeholder="you@company.com"
                    />
                  </label>
                  <label>
                    Password
                    <input
                      name="password"
                      type="password"
                      autoComplete={authMode === "signup" ? "new-password" : "current-password"}
                      required
                      minLength={8}
                      placeholder={authMode === "signup" ? "At least 8 characters" : "Your password"}
                    />
                  </label>
                  {message ? <p className="workiz-cart__message">{message}</p> : null}
                  {error ? <p className="workiz-cart__error">{error}</p> : null}
                  <button type="submit" className="workiz-cart__checkout" disabled={authLoading || loading}>
                    {authLoading || loading
                      ? "Please wait…"
                      : authMode === "signup"
                        ? "Create account & pay"
                        : "Sign in & pay"}
                  </button>
                </form>
                <p className="workiz-cart__auth-switch">
                  {authMode === "signup" ? (
                    <>
                      Already have an account?{" "}
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode("signin");
                          setError(null);
                          setMessage(null);
                        }}
                      >
                        Sign in
                      </button>
                    </>
                  ) : (
                    <>
                      New company?{" "}
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode("signup");
                          setError(null);
                          setMessage(null);
                        }}
                      >
                        Register
                      </button>
                    </>
                  )}
                </p>
              </div>
            ) : (
              <>
                {authedEmail ? (
                  <p className="workiz-cart__signed-in">
                    Signed in as <strong>{authedEmail}</strong>
                  </p>
                ) : null}
                {error ? <p className="workiz-cart__error">{error}</p> : null}
                <button
                  type="button"
                  className="workiz-cart__checkout"
                  onClick={checkout}
                  disabled={loading || !authReady}
                >
                  {loading ? "Redirecting…" : "Continue to payment"}
                </button>
              </>
            )}

            <Link href="/pricing" className="workiz-cart__continue">
              Change package
            </Link>
            <Link href="/courses" className="workiz-cart__company">
              Buying for yourself? Browse courses
            </Link>
            {!authedEmail ? (
              <p className="workiz-cart__auth-alt">
                Prefer the full page?{" "}
                <Link href={`/sign-up?next=${encodeURIComponent("/cart?kind=seats&checkout=1")}`}>
                  Sign up
                </Link>
                {" · "}
                <Link href={`/sign-in?next=${encodeURIComponent("/cart?kind=seats&checkout=1")}`}>
                  Sign in
                </Link>
              </p>
            ) : null}
          </aside>
        </div>
      </div>
    </section>
  );
}
