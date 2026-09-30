"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createBrowserSupabase } from "@workix/db/browser";
import { apiClient } from "@/lib/api";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";

export default function InvitePage() {
  const params = useParams<{ token: string }>();
  const [status, setStatus] = useState("Checking your session…");

  useEffect(() => {
    async function run() {
      const sb = createBrowserSupabase();
      const search = new URLSearchParams(window.location.search);
      const tokenHash = search.get("token_hash");
      const otpType = search.get("type");
      if (tokenHash && (otpType === "invite" || otpType === "magiclink")) {
        const verified = await sb.auth.verifyOtp({ token_hash: tokenHash, type: otpType });
        window.history.replaceState({}, "", window.location.pathname);
        if (verified.error) {
          const existing = await sb.auth.getUser();
          if (!existing.data.user) {
            setStatus(verified.error.message);
            return;
          }
        }
      }
      const { data } = await sb.auth.getUser();
      if (!data.user) {
        window.location.href = `/sign-in?next=/invite/${params.token}`;
        return;
      }
      try {
        const res = await apiClient<{ learnUrl: string }>(`/orgs/invites/${params.token}/accept`, { method: "POST" });
        setStatus("Seat claimed. Redirecting…");
        window.location.href = res.learnUrl;
      } catch (err) {
        setStatus((err as Error).message);
      }
    }
    run();
  }, [params.token]);

  return (
    <>
      <SiteHeader />
      <section className="course-sign-form-area">
        <div className="container">
          <h2>Company invite</h2>
          <p>{status}</p>
        </div>
      </section>
      <SiteFooter />
    </>
  );
}
