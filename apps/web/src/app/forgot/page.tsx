"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createBrowserSupabase } from "@workix/db/browser";
import { SignInPage } from "@/components/ui/sign-in";
import { AUTH_HERO_IMAGE, AUTH_TESTIMONIALS } from "@/lib/auth-ui";

export default function ForgotRoute() {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleReset(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "");
    const sb = createBrowserSupabase();
    await sb.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_WEB_URL}/sign-in`,
    });
    setMessage("If that email exists, a reset link is on the way.");
    setLoading(false);
  }

  return (
    <div className="bg-background text-foreground">
      <SignInPage
        mode="forgot"
        title={
          <span className="font-light tracking-tighter text-foreground">
            Reset your <span className="font-semibold">password</span>
          </span>
        }
        description="Enter your email and we'll send a secure reset link."
        heroImageSrc={AUTH_HERO_IMAGE}
        testimonials={AUTH_TESTIMONIALS}
        loading={loading}
        message={message}
        onSignIn={handleReset}
        onCreateAccount={() => router.push("/sign-in")}
      />
    </div>
  );
}
