"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { createBrowserSupabase } from "@workix/db/browser";
import { SignInPage } from "@/components/ui/sign-in";
import { AUTH_HERO_IMAGE, AUTH_TESTIMONIALS } from "@/lib/auth-ui";
import { getSafeNextPath } from "@/lib/auth-next";

function SignUpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = getSafeNextPath(searchParams.get("next"), "/");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSignUp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    const formData = new FormData(event.currentTarget);
    const fullName = String(formData.get("fullName") ?? "");
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");

    const sb = createBrowserSupabase();
    const { data, error: err } = await sb.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }

    if (data.session) {
      window.location.href = nextPath;
      return;
    }

    setMessage("Check your email to confirm your account, then sign in to continue checkout.");
    setLoading(false);
  }

  return (
    <SignInPage
      mode="sign-up"
      title={
        <span className="font-light tracking-tighter text-foreground">
          Create your <span className="font-semibold">Workiz</span> account
        </span>
      }
      description="Create an account to buy courses for yourself, or access training assigned by your company."
      heroImageSrc={AUTH_HERO_IMAGE}
      testimonials={AUTH_TESTIMONIALS}
      loading={loading}
      error={error}
      message={message}
      onSignIn={handleSignUp}
      onCreateAccount={() =>
        router.push(`/sign-in?next=${encodeURIComponent(nextPath)}`)
      }
    />
  );
}

export default function SignUpRoute() {
  return (
    <div className="bg-background text-foreground">
      <Suspense fallback={null}>
        <SignUpForm />
      </Suspense>
    </div>
  );
}
