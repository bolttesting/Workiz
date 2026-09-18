"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Progressive reveal for marketing sections marked with [data-reveal].
 * Runs once per element — no re-trigger on scroll-by.
 */
export function ScrollRevealRoot() {
  const pathname = usePathname();

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const nodes = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));

    if (reduce) {
      nodes.forEach((node) => node.classList.add("is-revealed"));
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("is-revealed");
          io.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.12 },
    );

    nodes.forEach((node) => {
      if (!node.classList.contains("is-revealed")) io.observe(node);
    });

    return () => io.disconnect();
  }, [pathname]);

  return null;
}
