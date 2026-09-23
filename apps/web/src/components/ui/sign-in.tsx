"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Eye, EyeOff } from "lucide-react";

// --- TYPE DEFINITIONS ---

export interface Testimonial {
  avatarSrc: string;
  name: string;
  handle: string;
  text: string;
}

interface SignInPageProps {
  title?: React.ReactNode;
  description?: React.ReactNode;
  heroImageSrc?: string;
  testimonials?: Testimonial[];
  mode?: "sign-in" | "sign-up" | "forgot";
  submitLabel?: string;
  loading?: boolean;
  error?: string | null;
  message?: string | null;
  onSignIn?: (event: React.FormEvent<HTMLFormElement>) => void;
  onResetPassword?: () => void;
  onCreateAccount?: () => void;
}

// --- SUB-COMPONENTS ---

const GlassInputWrapper = ({ children }: { children: React.ReactNode }) => (
  <div className="workiz-signin__field rounded-[1.25rem] border border-[#d7dde5] bg-[#eef1f5] shadow-[inset_0_1px_2px_rgba(16,40,70,0.06)] transition-colors focus-within:border-[#102846]/35 focus-within:bg-[#e8ecf2] focus-within:shadow-[inset_0_1px_2px_rgba(16,40,70,0.08),0_0_0_3px_rgba(16,40,70,0.08)]">
    {children}
  </div>
);

const TestimonialCard = ({ testimonial }: { testimonial: Testimonial }) => (
  <div className="workiz-signin__testimonial flex w-full max-w-[540px] items-start gap-2.5 rounded-2xl border border-white/30 bg-[#102846]/80 px-3.5 py-3 shadow-[0_8px_24px_rgba(0,0,0,0.28)] backdrop-blur-xl">
    <img
      src={testimonial.avatarSrc}
      className="h-8 w-8 shrink-0 rounded-xl object-cover"
      alt=""
    />
    <div className="min-w-0 leading-snug">
      <p className="truncate text-[13px] font-semibold" style={{ color: "#ffffff" }}>
        {testimonial.name}
      </p>
      <p className="truncate text-[11px]" style={{ color: "rgba(255,255,255,0.7)" }}>
        {testimonial.handle}
      </p>
      <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed" style={{ color: "#ffffff" }}>
        {testimonial.text}
      </p>
    </div>
  </div>
);

function TestimonialCarousel({ testimonials }: { testimonials: Testimonial[] }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (testimonials.length <= 1) return;
    const id = window.setInterval(() => {
      setIndex((current) => (current + 1) % testimonials.length);
    }, 4500);
    return () => window.clearInterval(id);
  }, [testimonials.length]);

  const active = testimonials[index];
  if (!active) return null;

  const goPrev = () => {
    setIndex((current) => (current - 1 + testimonials.length) % testimonials.length);
  };

  const goNext = () => {
    setIndex((current) => (current + 1) % testimonials.length);
  };

  return (
    <div className="absolute bottom-8 left-1/2 z-10 flex w-full max-w-[640px] -translate-x-1/2 flex-col items-center gap-3 px-4">
      <div className="flex w-full items-center gap-2">
        {testimonials.length > 1 ? (
          <button
            type="button"
            aria-label="Previous testimonial"
            onClick={goPrev}
            className="workiz-signin__carousel-btn flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/50 bg-white/15 text-white backdrop-blur-sm transition hover:bg-white/30"
          >
            <ChevronLeft className="h-5 w-5" strokeWidth={2.25} color="#ffffff" />
          </button>
        ) : null}

        <div key={index} className="animate-testimonial min-w-0 flex-1">
          <TestimonialCard testimonial={active} />
        </div>

        {testimonials.length > 1 ? (
          <button
            type="button"
            aria-label="Next testimonial"
            onClick={goNext}
            className="workiz-signin__carousel-btn flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/50 bg-white/15 text-white backdrop-blur-sm transition hover:bg-white/30"
          >
            <ChevronRight className="h-5 w-5" strokeWidth={2.25} color="#ffffff" />
          </button>
        ) : null}
      </div>

      {testimonials.length > 1 ? (
        <div className="flex items-center gap-2">
          {testimonials.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Show testimonial ${i + 1}`}
              onClick={() => setIndex(i)}
              className={`workiz-signin__dot rounded-full border-0 transition-all ${
                i === index ? "h-2.5 w-2.5 opacity-100" : "h-2 w-2 opacity-55 hover:opacity-90"
              }`}
              style={{ backgroundColor: "#ffffff" }}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

// --- MAIN COMPONENT ---

export const SignInPage: React.FC<SignInPageProps> = ({
  title = <span className="font-light tracking-tighter text-foreground">Welcome</span>,
  description = "Access your account and continue your journey with us",
  heroImageSrc,
  testimonials = [],
  mode = "sign-in",
  submitLabel,
  loading = false,
  error = null,
  message = null,
  onSignIn,
  onResetPassword,
  onCreateAccount,
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const isSignUp = mode === "sign-up";
  const isForgot = mode === "forgot";
  const buttonLabel =
    submitLabel ?? (isForgot ? "Send reset link" : isSignUp ? "Create account" : "Sign In");

  return (
    <div className="workiz-signin flex h-[100dvh] w-[100dvw] flex-col font-[Outfit,ui-sans-serif,system-ui,sans-serif] md:flex-row">
      {/* Left column: form */}
      <section className="relative flex flex-1 items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="flex flex-col gap-6">
            <div className="animate-element workiz-signin__brand-row flex flex-col items-center gap-4 text-center">
              <Link href="/" className="workiz-signin__logo inline-flex shrink-0 items-center">
                <img src="/assets/images/logo.png" alt="Workiz" />
              </Link>
              <h1 className="workiz-signin__title animate-delay-100 text-4xl font-semibold leading-tight md:text-5xl">
                {title}
              </h1>
            </div>
            <p className="animate-element animate-delay-200 text-muted-foreground">{description}</p>

            <form className="space-y-5" onSubmit={onSignIn}>
              {isSignUp ? (
                <div className="animate-element animate-delay-250">
                  <label className="text-sm font-medium text-muted-foreground">Full name</label>
                  <GlassInputWrapper>
                    <input
                      name="fullName"
                      type="text"
                      autoComplete="name"
                      required
                      placeholder="Enter your full name"
                      className="workiz-signin__input w-full bg-transparent px-4 py-[1.05rem] text-sm text-foreground placeholder:text-[#8b93a0] focus:outline-none"
                    />
                  </GlassInputWrapper>
                </div>
              ) : null}

              <div className="animate-element animate-delay-300">
                <label className="text-sm font-medium text-muted-foreground">Email Address</label>
                <GlassInputWrapper>
                  <input
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    placeholder="Enter your email address"
                    className="workiz-signin__input w-full bg-transparent px-4 py-[1.05rem] text-sm text-foreground placeholder:text-[#8b93a0] focus:outline-none"
                  />
                </GlassInputWrapper>
              </div>

              {!isForgot ? (
                <div className="animate-element animate-delay-400">
                  <label className="text-sm font-medium text-muted-foreground">Password</label>
                  <GlassInputWrapper>
                    <div className="relative">
                      <input
                        name="password"
                        type={showPassword ? "text" : "password"}
                        autoComplete={isSignUp ? "new-password" : "current-password"}
                        required
                        minLength={isSignUp ? 8 : undefined}
                        placeholder={isSignUp ? "At least 8 characters" : "Enter your password"}
                        className="workiz-signin__input w-full bg-transparent px-4 py-[1.05rem] pr-12 text-sm text-foreground placeholder:text-[#8b93a0] focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="workiz-signin__eye absolute inset-y-0 right-3 flex items-center border-0 bg-transparent p-0"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? (
                          <EyeOff className="h-5 w-5 text-muted-foreground transition-colors hover:text-foreground" />
                        ) : (
                          <Eye className="h-5 w-5 text-muted-foreground transition-colors hover:text-foreground" />
                        )}
                      </button>
                    </div>
                  </GlassInputWrapper>
                </div>
              ) : null}

              {mode === "sign-in" ? (
                <div className="animate-element animate-delay-500 flex items-center justify-between text-sm">
                  <label className="workiz-signin__remember flex cursor-pointer items-center">
                    <input type="checkbox" name="rememberMe" className="custom-checkbox" />
                    <span className="workiz-signin__remember-label text-foreground/90">
                      Keep me signed in
                    </span>
                  </label>
                  <a
                    href="/forgot"
                    onClick={(e) => {
                      e.preventDefault();
                      onResetPassword?.();
                    }}
                    className="workiz-signin__accent transition-colors hover:underline"
                  >
                    Reset password
                  </a>
                </div>
              ) : null}

              {error ? (
                <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
                  {error}
                </p>
              ) : null}
              {message ? (
                <p
                  className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
                  role="status"
                >
                  {message}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={loading}
                className="workiz-signin__submit animate-element animate-delay-600 w-full rounded-[1.25rem] border-0 bg-[#102846] py-[1.05rem] text-[15px] font-semibold text-[#f3e6c8] transition-colors hover:bg-[#0c1f37] disabled:cursor-not-allowed disabled:opacity-65"
              >
                {loading ? "Please wait…" : buttonLabel}
              </button>
            </form>

            <div className="animate-element animate-delay-700 flex flex-col items-center gap-2.5 text-center text-sm text-muted-foreground">
              <p className="m-0">
              {isSignUp ? (
                <>
                  Already have an account?{" "}
                  <a
                    href="/sign-in"
                    onClick={(e) => {
                      e.preventDefault();
                      onCreateAccount?.();
                    }}
                    className="workiz-signin__accent hover:underline"
                  >
                    Sign in
                  </a>
                </>
              ) : isForgot ? (
                <>
                  Remembered your password?{" "}
                  <a
                    href="/sign-in"
                    onClick={(e) => {
                      e.preventDefault();
                      onCreateAccount?.();
                    }}
                    className="workiz-signin__accent hover:underline"
                  >
                    Sign in
                  </a>
                </>
              ) : (
                <>
                  New to Workiz?{" "}
                  <a
                    href="/sign-up"
                    onClick={(e) => {
                      e.preventDefault();
                      onCreateAccount?.();
                    }}
                    className="workiz-signin__accent hover:underline"
                  >
                    Create Account
                  </a>
                </>
              )}
              </p>
              <Link href="/" className="workiz-signin__home-link">
                Home
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Right column: hero image + testimonials */}
      {heroImageSrc ? (
        <section className="relative hidden flex-1 p-4 md:block">
          <div
            className="animate-slide-right animate-delay-300 absolute inset-4 rounded-3xl bg-cover bg-center"
            style={{ backgroundImage: `url(${heroImageSrc})` }}
          />
          {testimonials.length > 0 ? <TestimonialCarousel testimonials={testimonials} /> : null}
        </section>
      ) : null}
    </div>
  );
};
