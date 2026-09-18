"use client";

import { useEffect, useState } from "react";

const MIN_MS = 900;
const MAX_MS = 2400;
const EASE = "cubic-bezier(0.23, 1, 0.32, 1)";

export function SiteLoader() {
  const [phase, setPhase] = useState<"in" | "out" | "gone">("in");

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const started = performance.now();
    let finished = false;
    let maxTimer: number | undefined;

    const finish = () => {
      if (finished) return;
      finished = true;
      if (maxTimer) window.clearTimeout(maxTimer);

      const wait = reduce ? 0 : Math.max(0, MIN_MS - (performance.now() - started));
      window.setTimeout(() => {
        setPhase("out");
        window.setTimeout(() => setPhase("gone"), reduce ? 0 : 480);
      }, wait);
    };

    if (document.readyState === "complete") {
      finish();
    } else {
      window.addEventListener("load", finish, { once: true });
    }

    maxTimer = window.setTimeout(finish, reduce ? 200 : MAX_MS);

    return () => {
      window.removeEventListener("load", finish);
      if (maxTimer) window.clearTimeout(maxTimer);
    };
  }, []);

  if (phase === "gone") return null;

  return (
    <div
      className={`workiz-loader${phase === "out" ? " is-leaving" : ""}`}
      style={{ transitionTimingFunction: EASE }}
      aria-hidden={phase !== "in"}
      aria-busy={phase === "in"}
      role="status"
    >
      <div className="workiz-loader__inner">
        <img src="/assets/images/logo.png" alt="" className="workiz-loader__logo" />
        <p className="workiz-loader__mark">WORKIZ</p>
        <p className="workiz-loader__tag">Learn. Develop. Grow.</p>
        <div className="workiz-loader__bar" aria-hidden="true">
          <span />
        </div>
      </div>
    </div>
  );
}
