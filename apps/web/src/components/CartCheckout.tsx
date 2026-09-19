"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { formatMoney } from "@workix/config";
import { ArrowUpRight, ShoppingBag, Trash2 } from "lucide-react";
import { createBrowserSupabase } from "@workix/db/browser";
import { useCart } from "@/lib/cart";
import { apiClient } from "@/lib/api";

type AuthMode = "signup" | "signin";

export function CartCheckout() {
  const searchParams = useSearchParams();
  const { items, totalCents, removeItem, clear } = useCart();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [authedEmail, setAuthedEmail] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("signup");
  const [authLoading, setAuthLoading] = useState(false);
  const [isCompany, setIsCompany] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const currency = items[0]?.currency ?? "usd";
  const wantsCheckout = searchParams.get("checkout") === "1";

  useEffect(() => {
    const sb = createBrowserSupabase();
    sb.auth.getUser().then(({ data }) => {
      setAuthedEmail(data.user?.email ?? null);
      setAuthReady(true);
    });
  }, []);

  async function startCheckout() {
    if (!items.length) return;
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const { url } = await apiClient<{ url: string }>("/checkout/cart", {
        method: "POST",
        body: JSON.stringify({ courseIds: items.map((item) => item.id) }),
      });
      clear();
      window.location.href = url;
    } catch (err) {
      const text = (err as Error).message;
      if (text.toLowerCase().includes("unauthorized")) {
        setAuthedEmail(null);
        setAuthMode("signup");
        setError("Create an account or sign in to complete checkout.");
        setLoading(false);
        return;
      }
      setError(text);
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!authReady || !wantsCheckout || !authedEmail || !items.length || loading) return;
    const url = new URL(window.location.href);
    url.searchParams.delete("checkout");
    window.history.replaceState({}, "", url.pathname + url.search);
    void startCheckout();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authReady, wantsCheckout, authedEmail, items.length]);

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

    if (authMode === "signup" && isCompany && company.length < 2) {
      setError("Enter your company name, or uncheck company account.");
      setAuthLoading(false);
      return;
    }

    try {
      if (authMode === "signup") {
        const { data, error: err } = await sb.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              ...(isCompany
                ? { company_name: company, intended_role: "company_admin" }
                : { intended_role: "individual_learner" }),
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
    if (!items.length) return;
    if (!authedEmail) {
      setError("Create an account or sign in to complete checkout.");
      return;
    }
    await startCheckout();
  }

  return (
    <section className="workiz-cart">
      <div className="container">
        <div className="workiz-cart__intro">
          <p className="workiz-cart__eyebrow">INDIVIDUAL LEARNING</p>
          <h1 className="workiz-cart__title">Your cart</h1>
          <p className="workiz-cart__lede">
            Buy courses for yourself. Create an account at checkout if you don’t have one yet.
          </p>
        </div>

        {!items.length ? (
          <div className="workiz-cart__empty">
            <ShoppingBag size={28} strokeWidth={1.8} aria-hidden="true" />
            <h2>Your cart is empty</h2>
            <p>Browse the catalog and add courses you want to take.</p>
            <Link href="/courses" className="workiz-cart__primary">
              Browse courses
              <ArrowUpRight size={16} strokeWidth={2.4} aria-hidden="true" />
            </Link>
          </div>
        ) : (
          <div className="workiz-cart__layout">
            <div className="workiz-cart__list">
              {items.map((item) => (
                <article key={item.id} className="workiz-cart__row">
                  <Link href={`/courses/${item.slug}`} className="workiz-cart__thumb">
                    <img
                      src={item.thumbnail_url || "/assets/images/inner-img/course-thumb1.png"}
                      alt=""
                    />
                  </Link>
                  <div className="workiz-cart__copy">
                    <h2>
                      <Link href={`/courses/${item.slug}`}>{item.title}</Link>
                    </h2>
                    {item.subtitle ? <p>{item.subtitle}</p> : null}
                    <button
                      type="button"
                      className="workiz-cart__remove"
                      onClick={() => removeItem(item.id)}
                    >
                      <Trash2 size={14} strokeWidth={2.2} aria-hidden="true" />
                      Remove
                    </button>
                  </div>
                  <strong className="workiz-cart__price">
                    {formatMoney(item.price_cents, item.currency)}
                  </strong>
                </article>
              ))}
            </div>

            <aside className="workiz-cart__summary">
              <h2>Order summary</h2>
              <div className="workiz-cart__summary-row">
                <span>
                  {items.length} {items.length === 1 ? "course" : "courses"}
                </span>
                <strong>{formatMoney(totalCents, currency)}</strong>
              </div>
              <p className="workiz-cart__summary-note">
                You’ll complete payment securely with Stripe. Access opens in My learning.
              </p>

              {authReady && !authedEmail ? (
                <div className="workiz-cart__auth">
                  <form className="workiz-cart__auth-form" onSubmit={handleAuth}>
                    {authMode === "signup" ? (
                      <>
                        <label>
                          Full name
                          <input name="fullName" type="text" autoComplete="name" required placeholder="Your name" />
                        </label>
                        <label className="workiz-cart__company-check">
                          <input
                            type="checkbox"
                            checked={isCompany}
                            onChange={(e) => setIsCompany(e.target.checked)}
                          />
                          <span>This is a company account</span>
                        </label>
                        {isCompany ? (
                          <label>
                            Company name
                            <input
                              name="companyName"
                              type="text"
                              value={companyName}
                              onChange={(e) => setCompanyName(e.target.value)}
                              autoComplete="organization"
                              required
                              minLength={2}
                              placeholder="Acme Training LLC"
                            />
                          </label>
                        ) : null}
                      </>
                    ) : null}
                    <label>
                      Email
                      <input
                        name="email"
                        type="email"
                        autoComplete="email"
                        required
                        placeholder="you@email.com"
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
                          ? "Create account & checkout"
                          : "Sign in & checkout"}
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
                        New here?{" "}
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
                    {loading ? "Redirecting…" : "Checkout"}
                  </button>
                </>
              )}

              <Link href="/courses" className="workiz-cart__continue">
                Continue shopping
              </Link>
              <Link href="/pricing" className="workiz-cart__company">
                Buying for a company? Contract seats
              </Link>
              {!authedEmail ? (
                <p className="workiz-cart__auth-alt">
                  Prefer the full page?{" "}
                  <Link href={`/sign-up?next=${encodeURIComponent("/cart?checkout=1")}`}>Sign up</Link>
                  {" · "}
                  <Link href={`/sign-in?next=${encodeURIComponent("/cart?checkout=1")}`}>Sign in</Link>
                </p>
              ) : null}
            </aside>
          </div>
        )}
      </div>
    </section>
  );
}
