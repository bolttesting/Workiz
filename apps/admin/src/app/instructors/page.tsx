"use client";

import { useEffect, useState } from "react";
import { AdminShell } from "@/components/AdminShell";
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
  const [error, setError] = useState<string | null>(null);

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
  }

  useEffect(() => {
    refresh().catch((err) => setError((err as Error).message));
  }, []);

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

  return (
    <AdminShell>
      <h6 className="mb-24">Instructors</h6>
      <p className="text-secondary-light mb-24">
        Platform teachers. They do not sell courses. Assign them to a course, then they teach from Learn → Teach.
      </p>
      {error ? <p className="text-danger">{error}</p> : null}
      <form className="card radius-12 mb-24" onSubmit={makeInstructor}>
        <div className="card-body row gy-3">
          <div className="col-md-4">
            <select className="form-select" value={userId} onChange={(e) => setUserId(e.target.value)} required>
              <option value="">Promote an existing user</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.full_name} ({u.email}) — {u.role}
                </option>
              ))}
            </select>
          </div>
          <div className="col-md-3">
            <input className="form-control" placeholder="Headline" value={headline} onChange={(e) => setHeadline(e.target.value)} />
          </div>
          <div className="col-md-3">
            <input className="form-control" placeholder="Short bio (optional)" value={bio} onChange={(e) => setBio(e.target.value)} />
          </div>
          <div className="col-md-2">
            <button className="btn btn-primary-600 w-100" type="submit">
              Make instructor
            </button>
          </div>
        </div>
      </form>
      <form className="card radius-12 mb-24" onSubmit={assign}>
        <div className="card-body row gy-3">
          <div className="col-md-5">
            <select className="form-select" value={courseId} onChange={(e) => setCourseId(e.target.value)} required>
              <option value="">Course</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>
          <div className="col-md-5">
            <select className="form-select" value={assignUser} onChange={(e) => setAssignUser(e.target.value)} required>
              <option value="">Instructor</option>
              {instructors.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.full_name}
                </option>
              ))}
            </select>
          </div>
          <div className="col-md-2">
            <button className="btn btn-primary-600 w-100" type="submit">
              Assign
            </button>
          </div>
        </div>
      </form>
      <div className="card radius-12">
        <table className="table mb-0">
          <thead>
            <tr>
              <th>Instructor</th>
              <th>Email</th>
              <th>Courses</th>
            </tr>
          </thead>
          <tbody>
            {instructors.map((u) => {
              const assigned = assignments.filter((a) => a.user_id === u.id);
              return (
                <tr key={u.id}>
                  <td>{u.full_name}</td>
                  <td>{u.email}</td>
                  <td>
                    {assigned.length === 0 ? <span className="text-secondary-light">None</span> : null}
                    {assigned.map((a) => (
                      <div key={`${a.course_id}-${a.user_id}`} className="d-flex align-items-center gap-2 mb-1">
                        <span>{courseTitle(a.course_id)}</span>
                        <button className="btn btn-sm btn-outline-danger-600" type="button" onClick={() => unassign(a.course_id, a.user_id)}>
                          Remove
                        </button>
                      </div>
                    ))}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
