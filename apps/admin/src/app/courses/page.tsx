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
import { uploadAdminAsset, slugify, centsFromMajor, COURSE_CURRENCIES } from "@/lib/uploads";
import { COURSE_DEPARTMENTS, formatMoney, DIRHAM_SIGN } from "@workix/config";
import type { Course } from "@workix/db/types";

type CourseRow = Course & { created_at?: string };

const emptyForm = {
  title: "",
  slug: "",
  subtitle: "",
  description: "",
  thumbnail_url: "",
  price: 79,
  currency: "usd",
  duration_minutes: 60,
  level: "Leadership",
  published: true,
};

export default function CoursesPage() {
  const router = useRouter();
  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  async function refresh() {
    const res = await apiClient<{ courses: CourseRow[] }>("/admin/courses");
    setCourses(res.courses);
  }

  useEffect(() => {
    setLoading(true);
    refresh()
      .then(() => setError(null))
      .catch((err) => setError((err as Error).message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(
    () => courses.filter((c) => matchesQuery(query, [c.title, c.slug, c.subtitle, c.level])),
    [courses, query],
  );

  function patchForm<K extends keyof typeof emptyForm>(key: K, value: (typeof emptyForm)[K]) {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "title" && (!prev.slug || prev.slug === slugify(prev.title))) {
        next.slug = slugify(String(value));
      }
      return next;
    });
  }

  async function onThumb(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const publicUrl = await uploadAdminAsset(file, "courses");
      patchForm("thumbnail_url", publicUrl);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploading(false);
    }
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await apiClient<{ course: Course }>("/admin/courses", {
        method: "POST",
        body: JSON.stringify({
          title: form.title,
          slug: form.slug,
          subtitle: form.subtitle || undefined,
          description: form.description || undefined,
          thumbnail_url: form.thumbnail_url || undefined,
          price_cents: centsFromMajor(form.price),
          currency: form.currency,
          duration_minutes: form.duration_minutes,
          level: form.level,
          published: form.published,
        }),
      });
      setForm(emptyForm);
      setShowForm(false);
      await refresh();
      router.push(`/courses/${res.course.id}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function togglePublish(course: CourseRow) {
    setBusyId(course.id);
    setError(null);
    try {
      await apiClient(`/admin/courses/${course.id}`, {
        method: "PATCH",
        body: JSON.stringify({ published: !course.published }),
      });
      await refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <AdminShell>
      <AdminPageHeader
        title="Courses"
        description="Create catalog courses with the same fields shown on the marketing site."
        action={
          <button type="button" className="btn btn-primary-600 radius-8" onClick={() => setShowForm((v) => !v)}>
            {showForm ? "Hide form" : "New course"}
          </button>
        }
      />

      {error ? (
        <div className="alert alert-danger radius-8 mb-24" role="alert">
          {error}
        </div>
      ) : null}

      {showForm ? (
        <form className="card radius-12 shadow-1 mb-24" onSubmit={create}>
          <div className="card-header border-bottom bg-base py-16 px-24">
            <h6 className="mb-0 fw-semibold">New course — start with basics</h6>
            <p className="text-sm text-secondary-light mb-0 mt-4">
              After create you will open the builder: cover upload → chapters → lectures (video files).
            </p>
          </div>
          <div className="card-body row gy-3">
            <div className="col-md-6">
              <label className="form-label">Title *</label>
              <input
                className="form-control radius-8"
                value={form.title}
                onChange={(e) => patchForm("title", e.target.value)}
                required
              />
            </div>
            <div className="col-md-6">
              <label className="form-label">Slug *</label>
              <input
                className="form-control radius-8"
                value={form.slug}
                onChange={(e) => patchForm("slug", e.target.value)}
                required
              />
            </div>
            <div className="col-12">
              <label className="form-label">Short subtitle</label>
              <input
                className="form-control radius-8"
                value={form.subtitle}
                onChange={(e) => patchForm("subtitle", e.target.value)}
              />
            </div>
            <div className="col-md-4">
              <label className="form-label">Department</label>
              <select
                className="form-select radius-8"
                value={form.level}
                onChange={(e) => patchForm("level", e.target.value)}
              >
                {COURSE_DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-4">
              <label className="form-label">Price</label>
              <div className="input-group">
                <span className="input-group-text dirham-sign" aria-hidden="true">
                  {form.currency === "aed" ? DIRHAM_SIGN : "$"}
                </span>
                <input
                  className="form-control radius-8"
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.price}
                  onChange={(e) => patchForm("price", Number(e.target.value))}
                />
                <select
                  className="form-select radius-8"
                  style={{ maxWidth: 100 }}
                  value={form.currency}
                  onChange={(e) => patchForm("currency", e.target.value)}
                >
                  {COURSE_CURRENCIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
              <p className="text-sm text-secondary-light mt-8 mb-0">
                Enter amount in major units (e.g. 79.00), not cents.
              </p>
            </div>
            <div className="col-md-4">
              <label className="form-label">Cover image upload</label>
              <input
                className="form-control radius-8"
                type="file"
                accept="image/*"
                disabled={uploading}
                onChange={(e) => onThumb(e.target.files?.[0])}
              />
            </div>
            {form.thumbnail_url ? (
              <div className="col-12">
                <img
                  src={form.thumbnail_url}
                  alt=""
                  className="radius-8 border"
                  style={{ maxHeight: 120, objectFit: "cover" }}
                />
              </div>
            ) : null}
            <div className="col-12">
              <label className="d-flex align-items-center gap-2 mb-0">
                <input
                  type="checkbox"
                  checked={form.published}
                  onChange={(e) => patchForm("published", e.target.checked)}
                />
                Publish on the main website now
              </label>
              <p className="text-sm text-secondary-light mt-8 mb-0">
                Unpublished courses stay draft and will not appear on /courses.
              </p>
            </div>
            <div className="col-12 text-end">
              <button className="btn btn-primary-600 radius-8 px-24" type="submit" disabled={saving || uploading}>
                {saving ? "Creating…" : "Create & open builder"}
              </button>
            </div>
          </div>
        </form>
      ) : null}

      <AdminDataCard
        title="All courses"
        toolbar={<AdminSearchInput value={query} onChange={setQuery} placeholder="Search courses…" />}
      >
        {loading ? <LoadingState /> : null}
        {!loading ? (
          <div className="workiz-admin-table-wrap">
            <table className="table bordered-table mb-0">
              <thead>
                <tr>
                  <th>Course</th>
                  <th>Dept</th>
                  <th>Duration</th>
                  <th>Price</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <div className="d-flex align-items-center gap-3">
                        {c.thumbnail_url ? (
                          <img
                            src={c.thumbnail_url}
                            alt=""
                            className="radius-8"
                            style={{ width: 56, height: 40, objectFit: "cover" }}
                          />
                        ) : (
                          <div
                            className="radius-8 bg-neutral-100"
                            style={{ width: 56, height: 40 }}
                          />
                        )}
                        <div>
                          <div className="fw-semibold text-primary-light">{c.title}</div>
                          <div className="text-sm text-secondary-light">{c.slug}</div>
                        </div>
                      </div>
                    </td>
                    <td>{c.level || "—"}</td>
                    <td>{c.duration_minutes ? `${c.duration_minutes} min` : "—"}</td>
                    <td>{formatMoney(c.price_cents, c.currency)}</td>
                    <td>
                      <StatusBadge
                        label={c.published ? "Published" : "Draft"}
                        tone={c.published ? "success" : "warning"}
                      />
                    </td>
                    <td>
                      <div className="d-flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="btn btn-outline-primary-600 btn-sm radius-8"
                          disabled={busyId === c.id}
                          onClick={() => togglePublish(c)}
                        >
                          {c.published ? "Unpublish" : "Publish"}
                        </button>
                        <Link className="btn btn-primary-600 btn-sm radius-8" href={`/courses/${c.id}`}>
                          Edit
                        </Link>
                        {c.published ? (
                          <a
                            className="btn btn-outline-success-600 btn-sm radius-8"
                            href={`${process.env.NEXT_PUBLIC_WEB_URL || "http://localhost:3000"}/courses/${c.slug}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            View site
                          </a>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 ? <EmptyState message="No courses match your search." /> : null}
          </div>
        ) : null}
      </AdminDataCard>
    </AdminShell>
  );
}
