"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { SignInPage } from "@/components/ui/sign-in";
import { AUTH_HERO_IMAGE } from "@/lib/auth-ui";
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

    const api = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
    const res = await fetch(`${api}/auth/sign-up`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, fullName }),
    });
    const json = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      setError(json.error || "Could not create the account.");
      setLoading(false);
      return;
    }

    setMessage("Check your email to confirm your account, then sign in to continue checkout.");
    setLoading(false);
  }

  return (
    <SignInPage
      mode="sign-up"
      title={
        <span className="font-light text-foreground">
          Create your account
        </span>
      }
      description="Buy courses for yourself. If your company assigned training, use the invite from your admin."
      heroImageSrc={AUTH_HERO_IMAGE}
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
