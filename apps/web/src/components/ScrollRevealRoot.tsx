"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Progressive reveal for marketing sections marked with [data-reveal].
 * Runs once per element — no re-trigger on scroll-by.
 *
 * Content is visible by default; hiding only applies once <html> has `reveal-ready`,
 * so pages without JS (or before hydration) never show blank sections. Anything already
 * on screen is revealed without animation, and sections streamed in later (Suspense)
 * are picked up through a MutationObserver.
 */
export function ScrollRevealRoot() {
  const pathname = usePathname();

  useEffect(() => {
    const root = document.documentElement;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const seen = new WeakSet<Element>();

    const inView = (node: Element) => {
      const rect = node.getBoundingClientRect();
      return rect.top < window.innerHeight && rect.bottom > 0;
    };

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("is-revealed");
          io.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0 },
    );

    const track = (scope: ParentNode) => {
      const nodes = Array.from(scope.querySelectorAll<HTMLElement>("[data-reveal]"));
      if (scope instanceof HTMLElement && scope.matches("[data-reveal]")) nodes.push(scope);
      for (const node of nodes) {
        if (seen.has(node) || node.classList.contains("is-revealed")) continue;
        seen.add(node);
        if (reduce || inView(node)) node.classList.add("is-revealed");
        else io.observe(node);
      }
    };

    track(document);
    root.classList.add("reveal-ready");

    const mo = new MutationObserver((records) => {
      for (const record of records) {
        record.addedNodes.forEach((node) => {
          if (node instanceof HTMLElement) track(node);
        });
      }
    });
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, [pathname]);

  return null;
}
