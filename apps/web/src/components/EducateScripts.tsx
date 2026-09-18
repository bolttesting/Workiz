"use client";

import { useEffect } from "react";

const srcs = [
  "/assets/js/vendor/modernizr-3.5.0.min.js",
  "/assets/js/vendor/jquery-3.6.2.min.js",
  "/assets/js/popper.min.js",
  "/assets/js/bootstrap.min.js",
  "/assets/js/owl.carousel.min.js",
  "/assets/js/jquery.counterup.min.js",
  "/assets/js/waypoints.min.js",
  "/assets/js/wow.js",
  "/assets/js/imagesloaded.pkgd.min.js",
  "/venobox/venobox.min.js",
  "/assets/js/animated-text.js",
  "/assets/js/isotope.pkgd.min.js",
  "/assets/js/jquery.meanmenu.js",
  "/assets/js/jquery.scrollUp.js",
  "/assets/js/jquery.barfiller.js",
  "/assets/js/theme.js",
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

export function EducateScripts() {
  useEffect(() => {
    let cancelled = false;
    (async () => {
      for (const src of srcs) {
        if (cancelled) return;
        await loadScript(src);
      }
      document.body.classList.add("loaded");
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
