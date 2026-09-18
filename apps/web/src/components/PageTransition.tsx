"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";

const EASE_OUT: [number, number, number, number] = [0.23, 1, 0.32, 1];

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: reduceMotion ? "auto" : "smooth",
    });
  }, [pathname, reduceMotion]);

  if (reduceMotion) {
    return <>{children}</>;
  }

  // Opacity only — transform/filter on a parent breaks position:fixed sticky headers.
  return (
    <motion.div
      key={pathname}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.28, ease: EASE_OUT }}
    >
      {children}
    </motion.div>
  );
}
