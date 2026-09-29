"use client";

import { useEffect } from "react";

const srcs = [
  "/assets/js/vendor/jquery-3.6.2.min.js",
  "/assets/js/waypoints.min.js",
  "/assets/js/jquery.counterup.min.js",
  "/venobox/venobox.min.js",
];

function loadScript(src: string) {
  return new Promise<void>((resolve) => {
    const existing = document.querySelector(`script[data-educate="${src}"]`);
    if (existing) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = false;
    script.dataset.educate = src;
    script.onload = () => resolve();
    script.onerror = () => resolve();
    document.body.appendChild(script);
  });
}

type Jquery = {
  fn?: { counterUp?: unknown; venobox?: unknown };
  (selector: string): { counterUp: (options: object) => void; venobox: (options: object) => void };
};

export function HomePageScripts() {
  useEffect(() => {
    let cancelled = false;
    (async () => {
      for (const src of srcs) {
        if (cancelled) return;
        await loadScript(src);
      }
      if (cancelled) return;
      const $ = (window as Window & { jQuery?: Jquery }).jQuery;
      if (!$) return;
      if ($.fn?.counterUp) $(".counter").counterUp({ delay: 10, time: 1000 });
      if ($.fn?.venobox) $(".venobox").venobox({ numeratio: true, infinigall: true });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
