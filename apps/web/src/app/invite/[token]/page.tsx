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
