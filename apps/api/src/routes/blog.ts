import { Hono } from "hono";
import { z } from "zod";
import { adminDb } from "../lib/db.js";
import { requireRole, type Authed } from "../lib/auth.js";

export const blog = new Hono();

function formatDateLabel(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d
    .toLocaleString("en-GB", { day: "2-digit", month: "short", timeZone: "UTC" })
    .toUpperCase()
    .replace(" ", " ");
}

function formatDateFull(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function mapPublicPost(row: Record<string, unknown>) {
  const publishedAt = (row.published_at as string | null) ?? (row.created_at as string | null);
  const contentHtml = String(row.content_html ?? "");
  const bodyFromHtml = contentHtml
    .replace(/<blockquote>[\s\S]*?<\/blockquote>/gi, "")
    .split(/<\/p>/i)
    .map((chunk) =>
      chunk
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim(),
    )
    .filter(Boolean);
  const quoteMatch = contentHtml.match(/<blockquote>[\s\S]*?<p>([\s\S]*?)<\/p>[\s\S]*?<\/blockquote>/i);
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    content_html: contentHtml,
    category: row.category ?? "Learning",
    thumb: row.thumb_url ?? "/assets/images/home-one/blog-thumb1.png",
    author: row.author_name ?? "Workiz Team",
    authorImage: row.author_image_url ?? "/assets/images/home-one/blog-autor1.png",
    dateLabel: formatDateLabel(publishedAt),
    dateFull: formatDateFull(publishedAt),
    body: bodyFromHtml.length ? bodyFromHtml : [String(row.excerpt ?? "")],
    quote: quoteMatch?.[1]?.replace(/<[^>]+>/g, "").trim() ?? "",
    seo_title: row.seo_title,
    seo_description: row.seo_description,
    seo_keywords: row.seo_keywords,
    og_image_url: row.og_image_url ?? row.thumb_url,
    published_at: publishedAt,
  };
}

blog.get("/", async (c) => {
  const { data, error } = await adminDb
    .from("blog_posts")
    .select("*")
    .eq("published", true)
    .order("published_at", { ascending: false });
  if (error) return c.json({ error: error.message }, 400);
  return c.json({ posts: (data ?? []).map(mapPublicPost) });
});

blog.get("/:slug", async (c) => {
  const { data, error } = await adminDb
    .from("blog_posts")
    .select("*")
    .eq("slug", c.req.param("slug"))
    .eq("published", true)
    .maybeSingle();
  if (error) return c.json({ error: error.message }, 400);
  if (!data) return c.json({ error: "Not found" }, 404);
  return c.json({ post: mapPublicPost(data) });
});

export const adminBlog = new Hono<{ Variables: { auth: Authed } }>();
adminBlog.use("*", requireRole("super_admin"));

const blogSchema = z.object({
  slug: z.string().min(2),
  title: z.string().min(3),
  excerpt: z.string().optional().nullable(),
  content_html: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  thumb_url: z.string().optional().nullable(),
  author_name: z.string().optional().nullable(),
  author_image_url: z.string().optional().nullable(),
  seo_title: z.string().optional().nullable(),
  seo_description: z.string().optional().nullable(),
  seo_keywords: z.string().optional().nullable(),
  og_image_url: z.string().optional().nullable(),
  published: z.boolean().optional(),
  published_at: z.string().optional().nullable(),
});

adminBlog.get("/", async (c) => {
  const { data, error } = await adminDb.from("blog_posts").select("*").order("updated_at", { ascending: false });
  if (error) return c.json({ error: error.message }, 400);
  return c.json({ posts: data ?? [] });
});

adminBlog.get("/:id", async (c) => {
  const { data, error } = await adminDb.from("blog_posts").select("*").eq("id", c.req.param("id")).maybeSingle();
  if (error) return c.json({ error: error.message }, 400);
  if (!data) return c.json({ error: "Not found" }, 404);
  return c.json({ post: data });
});

adminBlog.post("/", async (c) => {
  const parsed = blogSchema.safeParse(await c.req.json());
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);
  const body = parsed.data;
  const published = body.published ?? false;
  const { data, error } = await adminDb
    .from("blog_posts")
    .insert({
      ...body,
      content_html: body.content_html ?? "",
      author_name: body.author_name || "Workiz Team",
      published,
      published_at: published ? body.published_at || new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .select("*")
    .single();
  if (error) return c.json({ error: error.message }, 400);
  return c.json({ post: data });
});

adminBlog.patch("/:id", async (c) => {
  const parsed = blogSchema.partial().safeParse(await c.req.json());
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);
  const body = { ...parsed.data };
  const patch: Record<string, unknown> = { ...body, updated_at: new Date().toISOString() };
  if (body.published === true && !body.published_at) {
    patch.published_at = new Date().toISOString();
  }
  if (body.published === false) {
    patch.published_at = null;
  }
  const { data, error } = await adminDb
    .from("blog_posts")
    .update(patch)
    .eq("id", c.req.param("id"))
    .select("*")
    .single();
  if (error) return c.json({ error: error.message }, 400);
  return c.json({ post: data });
});

adminBlog.delete("/:id", async (c) => {
  const { error } = await adminDb.from("blog_posts").delete().eq("id", c.req.param("id"));
  if (error) return c.json({ error: error.message }, 400);
  return c.json({ ok: true });
});
