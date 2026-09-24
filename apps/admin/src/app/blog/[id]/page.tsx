"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { AdminShell } from "@/components/AdminShell";
import { AdminPageHeader, StatusBadge } from "@/components/AdminUi";
import { RichTextEditor } from "@/components/RichTextEditor";
import { apiClient } from "@/lib/api";
import { slugify, uploadAdminAsset } from "@/lib/uploads";
import type { BlogPostRow } from "@workix/db/types";

type FormState = {
  title: string;
  slug: string;
  excerpt: string;
  content_html: string;
  category: string;
  thumb_url: string;
  author_name: string;
  author_image_url: string;
  seo_title: string;
  seo_description: string;
  seo_keywords: string;
  og_image_url: string;
  published: boolean;
};

export default function BlogEditorPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [form, setForm] = useState<FormState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    apiClient<{ post: BlogPostRow }>(`/admin/blog/${id}`)
      .then(({ post }) => {
        setForm({
          title: post.title,
          slug: post.slug,
          excerpt: post.excerpt ?? "",
          content_html: post.content_html ?? "",
          category: post.category ?? "",
          thumb_url: post.thumb_url ?? "",
          author_name: post.author_name ?? "Workiz Team",
          author_image_url: post.author_image_url ?? "",
          seo_title: post.seo_title ?? "",
          seo_description: post.seo_description ?? "",
          seo_keywords: post.seo_keywords ?? "",
          og_image_url: post.og_image_url ?? "",
          published: post.published,
        });
      })
      .catch((err) => setError((err as Error).message));
  }, [id]);

  function patch<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => {
      if (!prev) return prev;
      const next = { ...prev, [key]: value };
      if (key === "title" && (!prev.slug || prev.slug.startsWith("untitled-post"))) {
        next.slug = slugify(String(value));
      }
      return next;
    });
  }

  async function uploadImage(file: File | undefined, field: "thumb_url" | "author_image_url" | "og_image_url") {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const url = await uploadAdminAsset(file, "blog");
      patch(field, url);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploading(false);
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    setError(null);
    try {
      await apiClient(`/admin/blog/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          ...form,
          seo_title: form.seo_title || form.title,
          seo_description: form.seo_description || form.excerpt,
          og_image_url: form.og_image_url || form.thumb_url,
        }),
      });
      router.push("/blog");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (!form) {
    return (
      <AdminShell>
        <p>{error || "Loading…"}</p>
      </AdminShell>
    );
  }

  return (
    <AdminShell>
      <AdminPageHeader
        title="Edit blog post"
        description="Content, author, and SEO metadata for the marketing blog."
        action={
          <Link href="/blog" className="btn btn-outline-primary-600 radius-8">
            Back to blog
          </Link>
        }
      />
      {error ? (
        <div className="alert alert-danger radius-8 mb-24" role="alert">
          {error}
        </div>
      ) : null}

      <form onSubmit={save} className="row gy-4">
        <div className="col-xxl-8">
          <div className="card radius-12 shadow-1 mb-24">
            <div className="card-header border-bottom bg-base py-16 px-24 d-flex justify-content-between">
              <h6 className="mb-0 fw-semibold">Content</h6>
              <StatusBadge label={form.published ? "Published" : "Draft"} tone={form.published ? "success" : "warning"} />
            </div>
            <div className="card-body row gy-3">
              <div className="col-md-8">
                <label className="form-label">Title *</label>
                <input
                  className="form-control radius-8"
                  value={form.title}
                  onChange={(e) => patch("title", e.target.value)}
                  required
                />
              </div>
              <div className="col-md-4">
                <label className="form-label">Slug *</label>
                <input
                  className="form-control radius-8"
                  value={form.slug}
                  onChange={(e) => patch("slug", e.target.value)}
                  required
                />
              </div>
              <div className="col-md-6">
                <label className="form-label">Category</label>
                <input
                  className="form-control radius-8"
                  value={form.category}
                  onChange={(e) => patch("category", e.target.value)}
                />
              </div>
              <div className="col-md-6">
                <label className="form-label">Author name</label>
                <input
                  className="form-control radius-8"
                  value={form.author_name}
                  onChange={(e) => patch("author_name", e.target.value)}
                />
              </div>
              <div className="col-12">
                <label className="form-label">Excerpt</label>
                <textarea
                  className="form-control radius-8"
                  rows={3}
                  value={form.excerpt}
                  onChange={(e) => patch("excerpt", e.target.value)}
                />
              </div>
              <div className="col-12">
                <label className="form-label">Rich content</label>
                <RichTextEditor value={form.content_html} onChange={(html) => patch("content_html", html)} />
              </div>
            </div>
          </div>

          <div className="card radius-12 shadow-1">
            <div className="card-header border-bottom bg-base py-16 px-24">
              <h6 className="mb-0 fw-semibold">SEO settings</h6>
            </div>
            <div className="card-body row gy-3">
              <div className="col-12">
                <label className="form-label">SEO title</label>
                <input
                  className="form-control radius-8"
                  value={form.seo_title}
                  onChange={(e) => patch("seo_title", e.target.value)}
                  placeholder="Defaults to post title"
                />
              </div>
              <div className="col-12">
                <label className="form-label">SEO description</label>
                <textarea
                  className="form-control radius-8"
                  rows={3}
                  value={form.seo_description}
                  onChange={(e) => patch("seo_description", e.target.value)}
                  placeholder="Defaults to excerpt"
                />
              </div>
              <div className="col-12">
                <label className="form-label">SEO keywords</label>
                <input
                  className="form-control radius-8"
                  value={form.seo_keywords}
                  onChange={(e) => patch("seo_keywords", e.target.value)}
                  placeholder="learning, seats, certificates"
                />
              </div>
              <div className="col-md-8">
                <label className="form-label">Open Graph image URL</label>
                <input
                  className="form-control radius-8"
                  value={form.og_image_url}
                  onChange={(e) => patch("og_image_url", e.target.value)}
                />
              </div>
              <div className="col-md-4">
                <label className="form-label">Upload OG image</label>
                <input
                  className="form-control radius-8"
                  type="file"
                  accept="image/*"
                  disabled={uploading}
                  onChange={(e) => uploadImage(e.target.files?.[0], "og_image_url")}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="col-xxl-4">
          <div className="card radius-12 shadow-1 mb-24">
            <div className="card-header border-bottom bg-base py-16 px-24">
              <h6 className="mb-0 fw-semibold">Publish</h6>
            </div>
            <div className="card-body">
              <label className="d-flex align-items-center gap-2 mb-16">
                <input
                  type="checkbox"
                  checked={form.published}
                  onChange={(e) => patch("published", e.target.checked)}
                />
                Published on marketing site
              </label>
              <button className="btn btn-primary-600 w-100 radius-8" type="submit" disabled={saving || uploading}>
                {saving ? "Saving…" : "Save post"}
              </button>
            </div>
          </div>

          <div className="card radius-12 shadow-1 mb-24">
            <div className="card-header border-bottom bg-base py-16 px-24">
              <h6 className="mb-0 fw-semibold">Featured image</h6>
            </div>
            <div className="card-body">
              <input
                className="form-control radius-8 mb-12"
                value={form.thumb_url}
                onChange={(e) => patch("thumb_url", e.target.value)}
                placeholder="Image URL"
              />
              <input
                className="form-control radius-8 mb-12"
                type="file"
                accept="image/*"
                disabled={uploading}
                onChange={(e) => uploadImage(e.target.files?.[0], "thumb_url")}
              />
              {form.thumb_url ? (
                <img src={form.thumb_url} alt="" className="w-100 radius-8 border" style={{ maxHeight: 180, objectFit: "cover" }} />
              ) : null}
            </div>
          </div>

          <div className="card radius-12 shadow-1">
            <div className="card-header border-bottom bg-base py-16 px-24">
              <h6 className="mb-0 fw-semibold">Author image</h6>
            </div>
            <div className="card-body">
              <input
                className="form-control radius-8 mb-12"
                value={form.author_image_url}
                onChange={(e) => patch("author_image_url", e.target.value)}
              />
              <input
                className="form-control radius-8"
                type="file"
                accept="image/*"
                disabled={uploading}
                onChange={(e) => uploadImage(e.target.files?.[0], "author_image_url")}
              />
            </div>
          </div>
        </div>
      </form>
    </AdminShell>
  );
}
