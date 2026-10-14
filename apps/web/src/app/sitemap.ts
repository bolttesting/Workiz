import type { MetadataRoute } from "next";
import { publicApi } from "@/lib/session";

const STATIC_ROUTES = ["", "/courses", "/pricing", "/about", "/instructors", "/blog", "/faq", "/contact", "/verify"];

async function slugs(path: string, key: string): Promise<Array<{ slug: string; updated_at?: string | null }>> {
  try {
    const res = await fetch(`${publicApi()}${path}`, { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    const json = (await res.json()) as Record<string, Array<{ slug?: string; updated_at?: string | null }>>;
    return (json[key] ?? []).filter((row): row is { slug: string; updated_at?: string | null } => Boolean(row.slug));
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = (process.env.NEXT_PUBLIC_WEB_URL || "http://localhost:3000").replace(/\/$/, "");
  const [courses, posts] = await Promise.all([slugs("/courses", "courses"), slugs("/blog", "posts")]);
  return [
    ...STATIC_ROUTES.map((path) => ({ url: `${base}${path}`, changeFrequency: "weekly" as const, priority: path ? 0.6 : 1 })),
    ...courses.map((course) => ({
      url: `${base}/courses/${course.slug}`,
      lastModified: course.updated_at ?? undefined,
      changeFrequency: "weekly" as const,
      priority: 0.9,
    })),
    ...posts.map((post) => ({ url: `${base}/blog/${post.slug}`, changeFrequency: "monthly" as const, priority: 0.5 })),
  ];
}
