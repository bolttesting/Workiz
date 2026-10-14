"use client";

import { useEffect, useRef, useState } from "react";

export const COURSE_THUMB_FALLBACK = "/assets/images/inner-img/course-thumb1.png";

/**
 * Course image that swaps to the brand placeholder when the URL is empty or fails to load
 * (including failures that happen before hydration, which onError alone would miss).
 */
export function CourseThumb({
  src,
  alt = "",
  className,
}: {
  src: string | null | undefined;
  alt?: string;
  className?: string;
}) {
  const [current, setCurrent] = useState(src || COURSE_THUMB_FALLBACK);
  const ref = useRef<HTMLImageElement>(null);

  useEffect(() => {
    setCurrent(src || COURSE_THUMB_FALLBACK);
  }, [src]);

  useEffect(() => {
    const img = ref.current;
    if (img && img.complete && img.naturalWidth === 0 && current !== COURSE_THUMB_FALLBACK) {
      setCurrent(COURSE_THUMB_FALLBACK);
    }
  }, [current]);

  return (
    <img
      ref={ref}
      src={current}
      alt={alt}
      className={className}
      loading="lazy"
      decoding="async"
      onError={() => {
        if (current !== COURSE_THUMB_FALLBACK) setCurrent(COURSE_THUMB_FALLBACK);
      }}
    />
  );
}
