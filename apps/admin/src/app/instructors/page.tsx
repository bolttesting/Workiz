"use client";

import { useEffect, useMemo, useState } from "react";
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
import type { Course, CourseInstructor, Profile } from "@workix/db/types";

export default function InstructorsAdminPage() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [instructors, setInstructors] = useState<Profile[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [assignments, setAssignments] = useState<CourseInstructor[]>([]);
  const [userId, setUserId] = useState("");
  const [headline, setHeadline] = useState("Workiz instructor");
  const [bio, setBio] = useState("");
  const [courseId, setCourseId] = useState("");
  const [assignUser, setAssignUser] = useState("");
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    const [u, i, c] = await Promise.all([
      apiClient<{ users: Profile[] }>("/admin/users"),
      apiClient<{ users: Profile[]; assignments: CourseInstructor[] }>("/admin/instructors"),
      apiClient<{ courses: Course[] }>("/admin/courses"),
    ]);
    setUsers(u.users);
    setInstructors(i.users);
    setAssignments(i.assignments);
    setCourses(c.courses);
    if (!assignUser && i.users[0]) setAssignUser(i.users[0].id);
    if (!courseId && c.courses[0]) setCourseId(c.courses[0].id);
  }

  useEffect(() => {
    setLoading(true);
    refresh()
      .then(() => setError(null))
      .catch((err) => setError((err as Error).message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(
    () => instructors.filter((u) => matchesQuery(query, [u.full_name, u.email])),
    [instructors, query],
  );

  async function makeInstructor(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await apiClient("/admin/instructors", {
        method: "POST",
        body: JSON.stringify({ userId, headline, bio: bio || undefined }),
      });
      setUserId("");
      setBio("");
      await refresh();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function assign(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await apiClient(`/admin/courses/${courseId}/instructors`, {
        method: "POST",
        body: JSON.stringify({ userId: assignUser }),
      });
      await refresh();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function unassign(course: string, user: string) {
    setError(null);
    try {
      await apiClient(`/admin/courses/${course}/instructors/${user}`, { method: "DELETE" });
      await refresh();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  function courseTitle(id: string) {
    return courses.find((c) => c.id === id)?.title ?? id;
  }

  const candidates = users.filter((u) => u.role !== "instructor" && u.role !== "super_admin");

  return (
    <AdminShell>
      <AdminPageHeader
        title="Instructors"
        description="Promote users to instructors and assign them to catalog courses."
      />
      {error ? (
        <div className="alert alert-danger radius-8 mb-24" role="alert">
          {error}
        </div>
      ) : null}

      <div className="row gy-4 mb-24">
        <div className="col-xl-6">
          <form className="card radius-12 shadow-1 h-100" onSubmit={makeInstructor}>
            <div className="card-header border-bottom bg-base py-16 px-24">
              <h6 className="mb-0 fw-semibold">Promote to instructor</h6>
            </div>
            <div className="card-body row gy-3">
              <div className="col-12">
                <label className="form-label">User</label>
                <select className="form-select radius-8" value={userId} onChange={(e) => setUserId(e.target.value)} required>
                  <option value="">Select user…</option>
                  {candidates.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.full_name || u.email} ({u.role})
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-12">
                <label className="form-label">Headline</label>
                <input className="form-control radius-8" value={headline} onChange={(e) => setHeadline(e.target.value)} />
              </div>
              <div className="col-12">
                <label className="form-label">Bio</label>
                <textarea className="form-control radius-8" rows={3} value={bio} onChange={(e) => setBio(e.target.value)} />
              </div>
              <div className="col-12">
                <button className="btn btn-primary-600 radius-8" type="submit">
                  Make instructor
                </button>
              </div>
            </div>
          </form>
        </div>
        <div className="col-xl-6">
          <form className="card radius-12 shadow-1 h-100" onSubmit={assign}>
            <div className="card-header border-bottom bg-base py-16 px-24">
              <h6 className="mb-0 fw-semibold">Assign to course</h6>
            </div>
            <div className="card-body row gy-3">
              <div className="col-12">
                <label className="form-label">Instructor</label>
                <select
                  className="form-select radius-8"
                  value={assignUser}
                  onChange={(e) => setAssignUser(e.target.value)}
                  required
                >
                  <option value="">Select instructor…</option>
                  {instructors.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.full_name || u.email}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-12">
                <label className="form-label">Course</label>
                <select className="form-select radius-8" value={courseId} onChange={(e) => setCourseId(e.target.value)} required>
                  <option value="">Select course…</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-12">
                <button className="btn btn-primary-600 radius-8" type="submit">
                  Assign
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      <AdminDataCard
        title="Instructors & assignments"
        toolbar={<AdminSearchInput value={query} onChange={setQuery} placeholder="Search instructors…" />}
      >
        {loading ? <LoadingState /> : null}
        {!loading ? (
          <div className="workiz-admin-table-wrap">
            <table className="table bordered-table mb-0">
              <thead>
                <tr>
                  <th>Instructor</th>
                  <th>Assigned courses</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((person) => {
                  const links = assignments.filter((a) => a.user_id === person.id);
                  return (
                    <tr key={person.id}>
                      <td>
                        <div className="fw-semibold text-primary-light">{person.full_name || "—"}</div>
                        <div className="text-sm text-secondary-light">{person.email}</div>
                        <StatusBadge label="instructor" tone="info" />
                      </td>
                      <td>
                        {links.length === 0 ? (
                          <span className="text-secondary-light">No courses assigned</span>
                        ) : (
                          <div className="d-flex flex-column gap-2">
                            {links.map((link) => (
                              <div key={`${link.course_id}-${link.user_id}`} className="d-flex justify-content-between gap-3">
                                <span>{courseTitle(link.course_id)}</span>
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-danger-600 radius-8"
                                  onClick={() => unassign(link.course_id, link.user_id)}
                                >
                                  Remove
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filtered.length === 0 ? <EmptyState message="No instructors yet." /> : null}
          </div>
        ) : null}
      </AdminDataCard>
    </AdminShell>
  );
}
