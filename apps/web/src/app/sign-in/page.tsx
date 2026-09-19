"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { createBrowserSupabase } from "@workix/db/browser";
import { SignInPage } from "@/components/ui/sign-in";
import { AUTH_HERO_IMAGE, AUTH_TESTIMONIALS } from "@/lib/auth-ui";
import { getSafeNextPath } from "@/lib/auth-next";

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextParam = searchParams.get("next");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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

  return (
    <SignInPage
      title={
        <span className="font-light tracking-tighter text-foreground">
          Welcome back to <span className="font-semibold">Workiz</span>
        </span>
      }
      description="Sign in to checkout courses, continue learning, or manage company seats."
      heroImageSrc={AUTH_HERO_IMAGE}
      testimonials={AUTH_TESTIMONIALS}
      loading={loading}
      error={error}
      onSignIn={handleSignIn}
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
