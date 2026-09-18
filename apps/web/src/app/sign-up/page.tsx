"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createBrowserSupabase } from "@workix/db/browser";
import { SignInPage } from "@/components/ui/sign-in";
import { AUTH_HERO_IMAGE, AUTH_TESTIMONIALS } from "@/lib/auth-ui";

export default function SignUpRoute() {
  const router = useRouter();
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
    const { error: err } = await sb.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }
    setMessage("Check your email to confirm your account, then sign in.");
    setLoading(false);
  }

  return (
    <div className="bg-background text-foreground">
      <SignInPage
        mode="sign-up"
        title={
          <span className="font-light tracking-tighter text-foreground">
            Create your <span className="font-semibold">Workiz</span> account
          </span>
        }
        description="Create your Workiz account to access assigned professional training from your company."
        heroImageSrc={AUTH_HERO_IMAGE}
        testimonials={AUTH_TESTIMONIALS}
        loading={loading}
        error={error}
        message={message}
        onSignIn={handleSignUp}
        onCreateAccount={() => router.push("/sign-in")}
      />
    </div>
  );
}
