"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AdminShell } from "@/components/AdminShell";
import { apiClient } from "@/lib/api";
import { formatMoney } from "@workix/config";
import type { Course } from "@workix/db/types";

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [price, setPrice] = useState(7900);

  async function refresh() {
    const res = await apiClient<{ courses: Course[] }>("/admin/courses");
    setCourses(res.courses);
  }

  useEffect(() => {
    refresh().catch(() => undefined);
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    await apiClient("/admin/courses", {
      method: "POST",
      body: JSON.stringify({ title, slug, price_cents: price, published: false }),
    });
    setTitle("");
    setSlug("");
    await refresh();
  }

  return (
    <AdminShell>
      <div className="d-flex justify-content-between mb-24">
        <h6>Courses</h6>
      </div>
      <form className="card radius-12 mb-24" onSubmit={create}>
        <div className="card-body row gy-3">
          <div className="col-md-4">
            <input className="form-control" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div className="col-md-3">
            <input className="form-control" placeholder="slug" value={slug} onChange={(e) => setSlug(e.target.value)} required />
          </div>
          <div className="col-md-3">
            <input className="form-control" type="number" value={price} onChange={(e) => setPrice(Number(e.target.value))} />
          </div>
          <div className="col-md-2">
            <button className="btn btn-primary-600 w-100" type="submit">
              Create
            </button>
          </div>
        </div>
      </form>
      <div className="card radius-12">
        <table className="table bordered-table mb-0">
          <thead>
            <tr>
              <th>Title</th>
              <th>Price</th>
              <th>Published</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {courses.map((c) => (
              <tr key={c.id}>
                <td>{c.title}</td>
                <td>{formatMoney(c.price_cents, c.currency)}</td>
                <td>{c.published ? "Yes" : "No"}</td>
                <td>
                  <Link href={`/courses/${c.id}`}>Builder</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
