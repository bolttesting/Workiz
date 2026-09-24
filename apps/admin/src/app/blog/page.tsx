"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AdminShell } from "@/components/AdminShell";
import {
  AdminDataCard,
  AdminPageHeader,
  AdminSearchInput,
  EmptyState,
  LoadingState,
  StatusBadge,
  matchesQuery,
} from "@/components/AdminUi";
import { apiClient } from "@/lib/api";
import { slugify } from "@/lib/uploads";
import type { BlogPostRow } from "@workix/db/types";

export default function BlogAdminPage() {
  const router = useRouter();
  const [posts, setPosts] = useState<BlogPostRow[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  async function refresh() {
    const res = await apiClient<{ posts: BlogPostRow[] }>("/admin/blog");
    setPosts(res.posts);
  }

  useEffect(() => {
    setLoading(true);
    refresh()
      .then(() => setError(null))
      .catch((err) => setError((err as Error).message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(
    () => posts.filter((p) => matchesQuery(query, [p.title, p.slug, p.category, p.author_name])),
    [posts, query],
  );

  async function createPost() {
    setCreating(true);
    setError(null);
    try {
      const title = "Untitled post";
      const res = await apiClient<{ post: BlogPostRow }>("/admin/blog", {
        method: "POST",
        body: JSON.stringify({
          title,
          slug: `${slugify(title)}-${Date.now().toString(36)}`,
          excerpt: "",
          content_html: "<p></p>",
          category: "Learning",
          published: false,
        }),
      });
      router.push(`/blog/${res.post.id}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setCreating(false);
    }
  }

  async function removePost(id: string) {
    if (!window.confirm("Delete this blog post?")) return;
    setError(null);
    try {
      await apiClient(`/admin/blog/${id}`, { method: "DELETE" });
      await refresh();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <AdminShell>
      <AdminPageHeader
        title="Blog"
        description="Publish articles with SEO fields and rich HTML content for the marketing site."
        action={
          <button type="button" className="btn btn-primary-600 radius-8" disabled={creating} onClick={createPost}>
            {creating ? "Creating…" : "New post"}
          </button>
        }
      />
      {error ? (
        <div className="alert alert-danger radius-8 mb-24" role="alert">
          {error}
        </div>
      ) : null}

      <AdminDataCard
        title="All posts"
        toolbar={<AdminSearchInput value={query} onChange={setQuery} placeholder="Search posts…" />}
      >
        {loading ? <LoadingState /> : null}
        {!loading ? (
          <div className="workiz-admin-table-wrap">
            <table className="table bordered-table mb-0">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Category</th>
                  <th>Author</th>
                  <th>Status</th>
                  <th>Updated</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((post) => (
                  <tr key={post.id}>
                    <td>
                      <div className="fw-semibold text-primary-light">{post.title}</div>
                      <div className="text-sm text-secondary-light">{post.slug}</div>
                    </td>
                    <td>{post.category || "—"}</td>
                    <td>{post.author_name}</td>
                    <td>
                      <StatusBadge
                        label={post.published ? "Published" : "Draft"}
                        tone={post.published ? "success" : "warning"}
                      />
                    </td>
                    <td>{post.updated_at?.slice(0, 10) || "—"}</td>
                    <td>
                      <div className="d-flex gap-2">
                        <Link className="btn btn-primary-600 btn-sm radius-8" href={`/blog/${post.id}`}>
                          Edit
                        </Link>
                        <button
                          type="button"
                          className="btn btn-outline-danger-600 btn-sm radius-8"
                          onClick={() => removePost(post.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 ? <EmptyState message="No posts yet. Create your first article." /> : null}
          </div>
        ) : null}
      </AdminDataCard>
    </AdminShell>
  );
}
