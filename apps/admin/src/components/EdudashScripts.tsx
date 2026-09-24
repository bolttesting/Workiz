"use client";

import { useEffect } from "react";

const srcs = [
  "/assets/js/lib/jquery-3.7.1.min.js",
  "/assets/js/lib/bootstrap.bundle.min.js",
  "/assets/js/lib/iconify-icon.min.js",
  "/assets/js/lib/dataTables.min.js",
  "/assets/js/lib/apexcharts.min.js",
  "/assets/js/app.js",
];

export function EdudashScripts() {
  useEffect(() => {
    let cancelled = false;
    (async () => {
      for (const src of srcs) {
        if (cancelled) return;
        if (document.querySelector(`script[data-edudash="${src}"]`)) continue;
        await new Promise<void>((resolve) => {
          const script = document.createElement("script");
          script.src = src;
          script.async = false;
          script.dataset.edudash = src;
          script.onload = () => resolve();
          script.onerror = () => resolve();
          document.body.appendChild(script);
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  return null;
}
