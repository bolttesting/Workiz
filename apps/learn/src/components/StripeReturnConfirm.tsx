"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { apiClient } from "@/lib/api";

/** After Stripe Checkout redirect, confirm the session so enrollments work without webhooks. */
export function StripeReturnConfirm() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const purchased = searchParams.get("purchased") === "1" || searchParams.get("subscribed") === "1";
  const [message, setMessage] = useState<string | null>(null);
  const ran = useRef(false);

  useEffect(() => {
    if (!purchased || !sessionId || ran.current) return;
    ran.current = true;
    apiClient<{ ok: boolean }>("/checkout/confirm", {
      method: "POST",
      body: JSON.stringify({ sessionId }),
    })
      .then(() => {
        setMessage("Payment confirmed. Your access is ready.");
        const url = new URL(window.location.href);
        url.searchParams.delete("session_id");
        window.history.replaceState({}, "", url.toString());
      })
      .catch((err) => setMessage((err as Error).message));
  }, [purchased, sessionId]);

  if (!message) return null;
  return <p className="text-sm mb-3">{message}</p>;
}
