"use client";

import { useState } from "react";
import { apiClient } from "@/lib/api";

export function BuyCourseButton({ courseId }: { courseId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function buy() {
    setLoading(true);
    setError(null);
    try {
      const { url } = await apiClient<{ url: string }>("/checkout/course", {
        method: "POST",
        body: JSON.stringify({ courseId }),
      });
      window.location.href = url;
    } catch (err) {
      const message = (err as Error).message;
      if (message.toLowerCase().includes("unauthorized")) {
        window.location.href = "/sign-in";
        return;
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="course-btn">
      <button type="button" className="btn btn_primary" onClick={buy} disabled={loading}>
        {loading ? "Redirecting…" : "Buy this course"}
      </button>
      {error ? <p className="text-danger mt-2">{error}</p> : null}
    </div>
  );
}
