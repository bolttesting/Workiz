import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = (process.env.NEXT_PUBLIC_WEB_URL || "http://localhost:3000").replace(/\/$/, "");
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/cart", "/invite/", "/sign-in", "/sign-up", "/forgot"] },
    sitemap: `${base}/sitemap.xml`,
  };
}
