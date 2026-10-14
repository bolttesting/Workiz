"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { createBrowserSupabase } from "@workix/db/browser";
import { SignInPage } from "@/components/ui/sign-in";
import { AUTH_HERO_IMAGE } from "@/lib/auth-ui";
import { getSafeNextPath, nextIsLearnApp } from "@/lib/auth-next";

async function goAfterSignIn(nextParam: string | null) {
  const sb = createBrowserSupabase();
  if (nextParam) {
    window.location.href = getSafeNextPath(nextParam, "/cart?checkout=1");
    return;
  }
  const { data: userData } = await sb.auth.getUser();
  const { data: profile } = userData.user
    ? await sb.from("profiles").select("role").eq("id", userData.user.id).maybeSingle()
    : { data: null };
  const learn = process.env.NEXT_PUBLIC_LEARN_URL ?? "http://localhost:3001";
  const admin = process.env.NEXT_PUBLIC_ADMIN_URL ?? "http://localhost:3002";
  window.location.href =
    profile?.role === "super_admin" ? admin : profile?.role === "instructor" ? `${learn}/teach` : learn;
}

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextParam = searchParams.get("next");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    const search = new URLSearchParams(window.location.search);
    const tokenHash = search.get("token_hash");
    const otpType = search.get("type");
    if (!tokenHash || (otpType !== "signup" && otpType !== "recovery")) return;
    let cancelled = false;
    setLoading(true);
    void (async () => {
      const sb = createBrowserSupabase();
      const verified = await sb.auth.verifyOtp({ token_hash: tokenHash, type: otpType });
      if (cancelled) return;
      const url = new URL(window.location.href);
      url.searchParams.delete("token_hash");
      url.searchParams.delete("type");
      window.history.replaceState({}, "", `${url.pathname}${url.search}`);
      if (verified.error) {
        setError(verified.error.message);
        setLoading(false);
        return;
      }
      if (otpType === "recovery") {
        setResetting(true);
        setMessage("Choose a new password for this account.");
        setLoading(false);
        return;
      }
      await goAfterSignIn(search.get("next"));
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSignIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");

    const sb = createBrowserSupabase();
    const { error: err } = await sb.auth.signInWithPassword({ email, password });
    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }

    await goAfterSignIn(nextParam);
  }

  async function handleNewPassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const formData = new FormData(event.currentTarget);
    const password = String(formData.get("password") ?? "");
    const sb = createBrowserSupabase();
    const { error: err } = await sb.auth.updateUser({ password });
    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }
    await goAfterSignIn(nextParam);
  }

  return (
    <SignInPage
      mode={resetting ? "reset" : "sign-in"}
      title={
        <span className="font-light text-foreground">
          {resetting ? (
            <>
              Choose a new <span className="font-semibold">password</span>
            </>
          ) : (
            <>
              Welcome back to <span className="font-semibold">Workiz</span>
            </>
          )}
        </span>
      }
      description={
        resetting
          ? "This link confirmed your email. Save a new password to continue."
          : nextIsLearnApp(nextParam)
            ? "Sign in to continue your course."
            : "Sign in to buy a course, continue learning, or manage company seats."
      }
      heroImageSrc={AUTH_HERO_IMAGE}
      loading={loading}
      error={error}
      message={message}
      onSignIn={resetting ? handleNewPassword : handleSignIn}
      onResetPassword={() => router.push("/forgot")}
      onCreateAccount={() =>
        router.push(
          nextParam
            ? `/sign-up?next=${encodeURIComponent(getSafeNextPath(nextParam, "/"))}`
            : "/sign-up",
        )
      }
    />
  );
}

export default function SignInRoute() {
  return (
    <div className="bg-background text-foreground">
      <Suspense fallback={null}>
        <SignInForm />
      </Suspense>
    </div>
  );
}
