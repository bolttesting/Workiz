"use client";

import { useEffect, useState } from "react";
import { LearnShell } from "@/components/LearnShell";
import { EmptyState, LearnDataCard, LearnPageHeader, StatusBadge, formatRole } from "@/components/LearnUi";
import { apiClient, downloadFile } from "@/lib/api";
import type { Course, Organization, Profile } from "@workix/db/types";

type Member = { id: string; email: string; full_name: string | null; role: string; department?: string | null; department_lead?: boolean };
type Invite = { id: string; email: string; status: string; department?: string | null };
type ProgressCourse = {
  courseId: string;
  title: string;
  done: number;
  total: number;
  status: string;
  lastLesson?: string | null;
  lastAt?: string | null;
  dueAt?: string | null;
  dueStatus?: string;
  quizStatus?: string;
  quizScore?: number | null;
  secondsSpent?: number;
};
type ProgressRow = { userId: string; name: string | null; email: string; department: string | null; courses: ProgressCourse[] };
type TeamCertificate = {
  id: string;
  userId: string;
  name: string | null;
  email: string;
  courseTitle: string;
  issuedAt: string;
  number?: string | null;
};
type CourseSet = { id: string; name: string; courseIds: string[]; ordered?: boolean };
type ActivityEvent = { id: string; actorName: string | null; action: string; detail: string; createdAt: string };

function formatSpent(seconds?: number) {
  if (!seconds) return "—";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours) return `${hours}h ${minutes}m`;
  if (minutes) return `${minutes}m`;
  return `${seconds}s`;
}
type InviteLink = { email: string; link: string };

function dueBadge(status?: string) {
  if (status === "overdue") return { label: "Overdue", tone: "danger" as const };
  if (status === "due_soon") return { label: "Due soon", tone: "warning" as const };
  if (status === "late") return { label: "Finished late", tone: "warning" as const };
  if (status === "on_time") return { label: "On time", tone: "success" as const };
  return null;
}

function quizText(course: ProgressCourse) {
  if (course.quizStatus === "passed") return `Passed ${course.quizScore ?? 0}%`;
  if (course.quizStatus === "failed") return `Failed ${course.quizScore ?? 0}%`;
  if (course.quizStatus === "not_taken") return "Not taken";
  return "—";
}

function csvCell(value: string) {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function progressLabel(status: string) {
  if (status === "finished") return { label: "Finished", tone: "success" as const };
  if (status === "in_progress") return { label: "In progress", tone: "info" as const };
  if (status === "no_lessons") return { label: "No lessons", tone: "neutral" as const };
  return { label: "Not started", tone: "warning" as const };
}
type Assignment = { user_id: string; course_id: string; source: string; title: string };
type InviteAssignment = { invite_id: string; course_id: string; title: string };

export default function TeamPage() {
  const [org, setOrg] = useState<Organization | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [inviteAssignments, setInviteAssignments] = useState<InviteAssignment[]>([]);
  const [catalog, setCatalog] = useState<Course[]>([]);
  const [pick, setPick] = useState<Record<string, string>>({});
  const [email, setEmail] = useState("");
  const [inviteDepartment, setInviteDepartment] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [bulkCourse, setBulkCourse] = useState("");
  const [deptName, setDeptName] = useState("");
  const [deptCourse, setDeptCourse] = useState("");
  const [progress, setProgress] = useState<ProgressRow[]>([]);
  const [certificates, setCertificates] = useState<TeamCertificate[]>([]);
  const [peopleQuery, setPeopleQuery] = useState("");
  const [progressDept, setProgressDept] = useState("");
  const [notStartedOnly, setNotStartedOnly] = useState(false);
  const [unassignCourse, setUnassignCourse] = useState("");
  const [dueOn, setDueOn] = useState("");
  const [deptDue, setDeptDue] = useState("");
  const [setDue, setSetDue] = useState("");
  const [bulkEmails, setBulkEmails] = useState("");
  const [bulkLinks, setBulkLinks] = useState<InviteLink[]>([]);
  const [courseSets, setCourseSets] = useState<CourseSet[]>([]);
  const [setName, setSetName] = useState("");
  const [setCourseIds, setSetCourseIds] = useState<string[]>([]);
  const [setOrdered, setSetOrdered] = useState(false);
  const [departmentLead, setDepartmentLead] = useState(false);
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [companyNote, setCompanyNote] = useState("");
  const [activity, setActivity] = useState<ActivityEvent[]>([]);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const [role, setRole] = useState<Profile["role"] | null>(null);

  async function refresh() {
    const [res, catalogRes, me, progressRes, certificateRes, setRes, activityRes, noteRes] = await Promise.all([
      apiClient<{
        organization: Organization | null;
        members: Member[];
        invites: Invite[];
        assignments: Assignment[];
        inviteAssignments?: InviteAssignment[];
        seatsOpen?: number;
      }>("/orgs/me"),
      apiClient<{ courses: Course[] }>("/courses"),
      apiClient<{ profile: Profile }>("/me"),
      apiClient<{ rows: ProgressRow[] }>("/orgs/progress").catch(() => ({ rows: [] as ProgressRow[] })),
      apiClient<{ certificates: TeamCertificate[] }>("/orgs/certificates").catch(() => ({ certificates: [] as TeamCertificate[] })),
      apiClient<{ sets: CourseSet[] }>("/orgs/course-sets").catch(() => ({ sets: [] as CourseSet[] })),
      apiClient<{ events: ActivityEvent[] }>("/orgs/activity").catch(() => ({ events: [] as ActivityEvent[] })),
      apiClient<{ note: string | null }>("/orgs/note").catch(() => ({ note: null })),
    ]);
    setRole(me.profile.role);
    setDepartmentLead(Boolean(me.profile.department_lead));
    setViewerId(me.profile.id);
    setOrg(res.organization);
    setMembers(res.members);
    setInvites(res.invites);
    setAssignments(res.assignments ?? []);
    setInviteAssignments(res.inviteAssignments ?? []);
    setCatalog(catalogRes.courses);
    setProgress(progressRes.rows ?? []);
    setCertificates(certificateRes.certificates ?? []);
    setCourseSets(setRes.sets ?? []);
    setActivity(activityRes.events ?? []);
    setCompanyNote(noteRes.note ?? "");
  }

  useEffect(() => {
    refresh().catch((err) => setError((err as Error).message));
  }, []);

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    try {
      const res = await apiClient<{ link: string; emailSent: boolean; emailError: string | null }>("/orgs/invites", {
        method: "POST",
        body: JSON.stringify({
          email,
          role: "company_learner",
          department: inviteDepartment.trim() || undefined,
        }),
      });
      setLink(res.link);
      setEmail("");
      setInviteDepartment("");
      setNotice(res.emailSent ? "Invite email sent." : res.emailError || "Invite saved, but the email was not sent.");
      await refresh();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function assign(memberId: string) {
    const courseId = pick[memberId];
    if (!courseId) {
      setError("Choose a course to assign.");
      return;
    }
    setError(null);
    setNotice(null);
    try {
      const res = await apiClient<{ title: string }>(`/orgs/members/${memberId}/courses`, {
        method: "POST",
        body: JSON.stringify({ courseId, dueAt: dueOn || undefined }),
      });
      setNotice(`Assigned ${res.title}. It now appears in that person's My courses.`);
      await refresh();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function assignInvite(inviteId: string) {
    const courseId = pick[inviteId];
    if (!courseId) {
      setError("Choose a course to assign.");
      return;
    }
    setError(null);
    setNotice(null);
    try {
      const res = await apiClient<{ title: string }>(`/orgs/invites/${inviteId}/courses`, {
        method: "POST",
        body: JSON.stringify({ courseId, dueAt: dueOn || undefined }),
      });
      setNotice(`${res.title} will be on their My courses when they accept the invite.`);
      await refresh();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function unassign(memberId: string, courseId: string) {
    setError(null);
    setNotice(null);
    try {
      await apiClient(`/orgs/members/${memberId}/courses/${courseId}`, { method: "DELETE" });
      setNotice("Course removed from that person.");
      await refresh();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function saveDepartment(memberId: string, department: string) {
    setError(null);
    try {
      await apiClient(`/orgs/members/${memberId}`, {
        method: "PATCH",
        body: JSON.stringify({ department: department.trim() || null }),
      });
      await refresh();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function assignSelected() {
    if (!bulkCourse) {
      setError("Choose a course to assign.");
      return;
    }
    if (selected.length === 0) {
      setError("Select at least one person.");
      return;
    }
    setError(null);
    setNotice(null);
    try {
      const res = await apiClient<{ title: string; assigned: number }>("/orgs/assign", {
        method: "POST",
        body: JSON.stringify({ courseId: bulkCourse, memberIds: selected, dueAt: dueOn || undefined }),
      });
      setNotice(`Assigned ${res.title} to ${res.assigned} ${res.assigned === 1 ? "person" : "people"}.`);
      setSelected([]);
      await refresh();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function assignDepartment(e: React.FormEvent) {
    e.preventDefault();
    if (!deptName.trim() || !deptCourse) {
      setError("Choose a department and a course.");
      return;
    }
    setError(null);
    setNotice(null);
    try {
      const res = await apiClient<{ title: string; assigned: number }>("/orgs/assign", {
        method: "POST",
        body: JSON.stringify({ courseId: deptCourse, department: deptName.trim(), dueAt: deptDue || undefined }),
      });
      setNotice(`Assigned ${res.title} to ${res.assigned} in ${deptName.trim()}.`);
      await refresh();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function inviteMany(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setBulkLinks([]);
    try {
      const res = await apiClient<{ created: InviteLink[]; skipped: { email: string; reason: string }[] }>("/orgs/invites/bulk", {
        method: "POST",
        body: JSON.stringify({
          emails: bulkEmails,
          department: inviteDepartment.trim() || undefined,
        }),
      });
      setBulkLinks(res.created);
      const skipped = res.skipped.length ? ` ${res.skipped.length} skipped.` : "";
      setNotice(`${res.created.length} invite link${res.created.length === 1 ? "" : "s"} ready.${skipped}`);
      setBulkEmails("");
      await refresh();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function saveCourseSet(e: React.FormEvent) {
    e.preventDefault();
    if (!setName.trim() || setCourseIds.length === 0) {
      setError("Name the set and choose at least one course.");
      return;
    }
    setError(null);
    setNotice(null);
    try {
      await apiClient("/orgs/course-sets", {
        method: "POST",
        body: JSON.stringify({ name: setName.trim(), courseIds: setCourseIds, ordered: setOrdered }),
      });
      setSetName("");
      setSetCourseIds([]);
      setSetOrdered(false);
      setNotice("Course set saved.");
      await refresh();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function assignCourseSet(setId: string) {
    if (selected.length === 0) {
      setError("Select at least one person.");
      return;
    }
    setError(null);
    setNotice(null);
    try {
      const res = await apiClient<{ name: string; assigned: number; courses: number }>(`/orgs/course-sets/${setId}/assign`, {
        method: "POST",
        body: JSON.stringify({ memberIds: selected, dueAt: setDue || undefined }),
      });
      setNotice(`Assigned ${res.name} (${res.courses} courses) to ${res.assigned} ${res.assigned === 1 ? "person" : "people"}.`);
      setSelected([]);
      await refresh();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  function downloadProgress(rows: ProgressRow[]) {
    const header = ["Name", "Email", "Department", "Course", "Lessons done", "Lessons total", "Time", "Last lesson", "Status", "Due date", "Due", "Quiz"];
    const lines = [header.join(",")];
    for (const person of rows) {
      const courses = person.courses.length
        ? person.courses
        : [{ courseId: "none", title: "No course assigned", done: 0, total: 0, status: "not_started" } as ProgressCourse];
      for (const course of courses) {
        const due = dueBadge(course.dueStatus);
        lines.push(
          [
            person.name || "Learner",
            person.email,
            person.department || "",
            course.title,
            course.courseId === "none" ? "" : String(course.done),
            course.courseId === "none" ? "" : String(course.total),
            formatSpent(course.secondsSpent),
            course.lastLesson || "",
            course.courseId === "none" ? "Waiting" : progressLabel(course.status).label,
            course.dueAt || "",
            due?.label || "",
            quizText(course),
          ]
            .map((cell) => csvCell(cell))
            .join(","),
        );
      }
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "team-progress.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function unassignSelected() {
    if (!unassignCourse) {
      setError("Choose a course to unassign.");
      return;
    }
    if (selected.length === 0) {
      setError("Select at least one person.");
      return;
    }
    setError(null);
    setNotice(null);
    try {
      const res = await apiClient<{ removed: number; kept: number }>("/orgs/unassign", {
        method: "POST",
        body: JSON.stringify({ courseId: unassignCourse, memberIds: selected }),
      });
      const kept = res.kept ? ` ${res.kept} purchased course${res.kept === 1 ? "" : "s"} stayed with the learner.` : "";
      setNotice(`Unassigned the course from ${res.removed} ${res.removed === 1 ? "person" : "people"}.${kept}`);
      setSelected([]);
      await refresh();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function cancelInvite(id: string) {
    setError(null);
    setNotice(null);
    try {
      await apiClient(`/orgs/invites/${id}`, { method: "DELETE" });
      setNotice("Invite cancelled. That seat is free again.");
      await refresh();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function remove(id: string) {
    await apiClient(`/orgs/members/${id}`, { method: "DELETE" });
    await refresh();
  }

  const canManage = role === "company_admin" || role === "super_admin";
  const canViewProgress = canManage || departmentLead;
  const pending = invites.filter((invite) => invite.status === "pending");
  const departmentNames = Array.from(
    new Set(
      [...members.map((member) => member.department), ...invites.map((invite) => invite.department)].filter(
        (name): name is string => Boolean(name && name.trim()),
      ),
    ),
  ).sort((a, b) => a.localeCompare(b));
  const pendingCount = pending.length;
  const seatsFull = Boolean(org && org.seat_used + pendingCount >= org.seat_limit);
  const seatsOpen = org ? Math.max(0, org.seat_limit - org.seat_used - pendingCount) : 0;
  const ownDepartment = members.find((member) => member.id === viewerId)?.department ?? "";
  const teamPeople =
    departmentLead && !canManage
      ? members.filter((member) => (member.department ?? "").toLowerCase() === ownDepartment.toLowerCase())
      : members;
  const showPeopleSearch = teamPeople.length > 5;
  const peopleNeedle = peopleQuery.trim().toLowerCase();
  const visibleMembers = peopleNeedle
    ? teamPeople.filter((member) =>
        [member.full_name, member.email, member.department, member.role].some((value) =>
          (value ?? "").toLowerCase().includes(peopleNeedle),
        ),
      )
    : teamPeople;
  const progressRows = progress.filter((person) => {
    if (progressDept && (person.department ?? "").toLowerCase() !== progressDept.toLowerCase()) return false;
    if (!notStartedOnly) return true;
    if (person.courses.length === 0) return true;
    return person.courses.some((course) => course.status === "not_started" || course.status === "no_lessons");
  });

  return (
    <LearnShell>
      <LearnPageHeader
        title="Team"
        description={
          org
            ? `${org.name} · ${org.seat_used} joined · ${pendingCount} invited · ${seatsOpen} of ${org.seat_limit} seats open`
            : "Buy company seats, then invite people and assign courses."
        }
      />
      {error ? (
        <div className="alert alert-danger radius-8 mb-24" role="alert">
          {error}
        </div>
      ) : null}
      {notice ? (
        <div className="alert alert-success radius-8 mb-24" role="status">
          {notice}
        </div>
      ) : null}
      {link ? (
        <div className="alert alert-warning radius-8 mb-24" role="status">
          Share this link if the email did not arrive:{" "}
          <a href={link} className="fw-semibold">
            {link}
          </a>
        </div>
      ) : null}
      {!org ? <EmptyState message="No company yet. Buy seats from the public Companies page." /> : null}
      {org && canManage ? <datalist id="workiz-departments">{departmentNames.map((name) => <option key={name} value={name} />)}</datalist> : null}
      {org && canManage ? (
        <>
        <form className="card radius-12 shadow-1 mb-24" onSubmit={invite}>
          <div className="card-header border-bottom bg-base py-16 px-24">
            <h6 className="mb-0 fw-semibold">Invite a learner</h6>
          </div>
          <div className="card-body d-flex flex-wrap gap-3">
            <input
              className="form-control radius-8"
              type="email"
              placeholder="colleague@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{ maxWidth: 360 }}
            />
            <input
              className="form-control radius-8"
              placeholder="Department (optional)"
              value={inviteDepartment}
              onChange={(e) => setInviteDepartment(e.target.value)}
              list="workiz-departments"
              style={{ maxWidth: 220 }}
            />
            <button className="btn btn-primary-600 radius-8" type="submit" disabled={seatsFull}>
              {seatsFull ? "No seats left" : "Invite"}
            </button>
            {seatsFull ? (
              <p className="text-sm text-secondary-light mb-0 w-100">
                Every seat is taken by someone who joined or by a pending invite. Cancel an invite or raise the seat limit.
              </p>
            ) : null}
          </div>
        </form>
        <form className="card radius-12 shadow-1 mb-24" onSubmit={inviteMany}>
          <div className="card-header border-bottom bg-base py-16 px-24">
            <h6 className="mb-0 fw-semibold">Invite several people</h6>
          </div>
          <div className="card-body d-flex flex-column gap-3">
            <textarea
              className="form-control radius-8"
              rows={4}
              placeholder={"One email per line\nnora@company.com\nsamir@company.com"}
              value={bulkEmails}
              onChange={(e) => setBulkEmails(e.target.value)}
              disabled={seatsFull}
            />
            <p className="text-sm text-secondary-light mb-0">
              Uses the department above when it is filled. Each person gets a link you can copy.
            </p>
            <button className="btn btn-primary-600 radius-8 align-self-start" type="submit" disabled={seatsFull}>
              Create invite links
            </button>
            {bulkLinks.length > 0 ? (
              <ul className="mb-0">
                {bulkLinks.map((row) => (
                  <li key={row.email} className="mb-8">
                    <div className="fw-medium">{row.email}</div>
                    <code className="text-sm">{row.link}</code>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </form>
        </>
      ) : null}
      {org && canManage ? (
        <>
        <div className="row gy-4 mb-24">
          <div className="col-lg-6">
            <form
              className="card radius-12 shadow-1 h-100"
              onSubmit={(e) => {
                e.preventDefault();
                void assignSelected();
              }}
            >
              <div className="card-header border-bottom bg-base py-16 px-24">
                <h6 className="mb-0 fw-semibold">Assign to selected people</h6>
              </div>
              <div className="card-body d-flex flex-wrap gap-3 align-items-end">
                <div style={{ minWidth: 220, flex: 1 }}>
                  <label className="form-label">Course</label>
                  <select className="form-select radius-8" value={bulkCourse} onChange={(e) => setBulkCourse(e.target.value)}>
                    <option value="">Choose a course</option>
                    {catalog.map((course) => (
                      <option key={course.id} value={course.id}>
                        {course.title}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label">Due date</label>
                  <input className="form-control radius-8" type="date" value={dueOn} onChange={(e) => setDueOn(e.target.value)} />
                </div>
                <button className="btn btn-primary-600 radius-8" type="submit">
                  Assign to {selected.length || "selected"}
                </button>
              </div>
              <div className="card-body border-top d-flex flex-wrap gap-3 align-items-end pt-16">
                <div style={{ minWidth: 220, flex: 1 }}>
                  <label className="form-label">Unassign a course</label>
                  <select className="form-select radius-8" value={unassignCourse} onChange={(e) => setUnassignCourse(e.target.value)}>
                    <option value="">Choose a course</option>
                    {catalog.map((course) => (
                      <option key={course.id} value={course.id}>
                        {course.title}
                      </option>
                    ))}
                  </select>
                </div>
                <button className="btn btn-outline-danger-600 radius-8" type="button" onClick={() => void unassignSelected()}>
                  Unassign from {selected.length || "selected"}
                </button>
              </div>
            </form>
          </div>
          <div className="col-lg-6">
            <form className="card radius-12 shadow-1 h-100" onSubmit={assignDepartment}>
              <div className="card-header border-bottom bg-base py-16 px-24">
                <h6 className="mb-0 fw-semibold">Assign to a department</h6>
              </div>
              <div className="card-body d-flex flex-wrap gap-3 align-items-end">
                <div style={{ minWidth: 160 }}>
                  <label className="form-label">Department</label>
                  <input
                    className="form-control radius-8"
                    list="workiz-departments"
                    value={deptName}
                    onChange={(e) => setDeptName(e.target.value)}
                    placeholder="Sales"
                  />
                </div>
                <div style={{ minWidth: 180, flex: 1 }}>
                  <label className="form-label">Course</label>
                  <select className="form-select radius-8" value={deptCourse} onChange={(e) => setDeptCourse(e.target.value)}>
                    <option value="">Choose a course</option>
                    {catalog.map((course) => (
                      <option key={course.id} value={course.id}>
                        {course.title}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label">Due date</label>
                  <input className="form-control radius-8" type="date" value={deptDue} onChange={(e) => setDeptDue(e.target.value)} />
                </div>
                <button className="btn btn-primary-600 radius-8" type="submit">
                  Assign
                </button>
              </div>
            </form>
          </div>
        </div>
        <form className="card radius-12 shadow-1 mb-24" onSubmit={saveCourseSet}>
          <div className="card-header border-bottom bg-base py-16 px-24">
            <h6 className="mb-0 fw-semibold">Course sets</h6>
          </div>
          <div className="card-body">
            <div className="d-flex flex-wrap gap-3 align-items-end mb-16">
              <div style={{ minWidth: 200 }}>
                <label className="form-label">Name</label>
                <input className="form-control radius-8" value={setName} onChange={(e) => setSetName(e.target.value)} placeholder="New hire" />
              </div>
              <label className="d-flex align-items-center gap-2 mb-0 text-sm">
                <input type="checkbox" checked={setOrdered} onChange={(e) => setSetOrdered(e.target.checked)} />
                Require this order
              </label>
              <button className="btn btn-primary-600 radius-8" type="submit">
                Save set
              </button>
            </div>
            <p className="text-sm text-secondary-light">Check courses in the order people should take them.</p>
            <div className="d-flex flex-wrap gap-3 mb-16">
              {catalog.map((course) => (
                <label key={course.id} className="d-flex align-items-center gap-2 mb-0 text-sm">
                  <input
                    type="checkbox"
                    checked={setCourseIds.includes(course.id)}
                    onChange={(e) =>
                      setSetCourseIds((current) =>
                        e.target.checked ? [...current, course.id] : current.filter((id) => id !== course.id),
                      )
                    }
                  />
                  {course.title}
                </label>
              ))}
            </div>
            {courseSets.length === 0 ? <p className="text-secondary-light mb-0">No sets yet. A set assigns every course in it at once.</p> : null}
            {courseSets.map((set) => (
              <div key={set.id} className="d-flex flex-wrap gap-3 align-items-center border-top pt-12 mt-12">
                <div>
                  <div className="fw-medium">{set.name}</div>
                  <div className="text-sm text-secondary-light">
                    {set.courseIds.length} courses{set.ordered ? " · in order" : ""}
                  </div>
                </div>
                <label className="d-flex align-items-center gap-2 mb-0 text-sm">
                  <input
                    type="checkbox"
                    checked={Boolean(set.ordered)}
                    onChange={(e) => {
                      void apiClient(`/orgs/course-sets/${set.id}`, {
                        method: "PATCH",
                        body: JSON.stringify({ ordered: e.target.checked }),
                      })
                        .then(() => refresh())
                        .catch((err) => setError((err as Error).message));
                    }}
                  />
                  In order
                </label>
                <input className="form-control radius-8" type="date" value={setDue} onChange={(e) => setSetDue(e.target.value)} aria-label={`Due date for ${set.name}`} />
                <button className="btn btn-primary-600 btn-sm radius-8" type="button" onClick={() => void assignCourseSet(set.id)}>
                  Assign to {selected.length || "selected"}
                </button>
                <button
                  className="btn btn-outline-danger-600 btn-sm radius-8"
                  type="button"
                  onClick={() => {
                    void apiClient(`/orgs/course-sets/${set.id}`, { method: "DELETE" })
                      .then(() => refresh())
                      .catch((err) => setError((err as Error).message));
                  }}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        </form>
        </>
      ) : null}
      {org ? (
        <LearnDataCard
          title="People"
          toolbar={
            showPeopleSearch ? (
              <input
                className="form-control form-control-sm radius-8"
                type="search"
                placeholder="Search people"
                aria-label="Search people"
                value={peopleQuery}
                onChange={(e) => setPeopleQuery(e.target.value)}
                style={{ maxWidth: 220 }}
              />
            ) : null
          }
        >
          <div className="workiz-admin-table-wrap">
            <table className="table bordered-table mb-0">
              <thead>
                <tr>
                  {canManage ? (
                    <th>
                      <input
                        type="checkbox"
                        aria-label="Select everyone"
                        checked={visibleMembers.length > 0 && visibleMembers.every((member) => selected.includes(member.id))}
                        onChange={(e) =>
                          setSelected(
                            e.target.checked
                              ? Array.from(new Set([...selected, ...visibleMembers.map((member) => member.id)]))
                              : selected.filter((id) => !visibleMembers.some((member) => member.id === id)),
                          )
                        }
                      />
                    </th>
                  ) : null}
                  <th>Member</th>
                  <th>Department</th>
                  <th>Role</th>
                  <th>Courses</th>
                  {canManage ? <th /> : null}
                </tr>
              </thead>
              <tbody>
                {visibleMembers.map((member) => {
                  const memberCourses = assignments.filter((row) => row.user_id === member.id);
                  return (
                    <tr key={member.id}>
                      {canManage ? (
                        <td>
                          <input
                            type="checkbox"
                            aria-label={`Select ${member.email}`}
                            checked={selected.includes(member.id)}
                            onChange={(e) =>
                              setSelected((current) =>
                                e.target.checked ? [...current, member.id] : current.filter((id) => id !== member.id),
                              )
                            }
                          />
                        </td>
                      ) : null}
                      <td>
                        <div className="fw-medium text-primary-light">{member.full_name || "Learner"}</div>
                        <div className="text-sm text-secondary-light">{member.email}</div>
                      </td>
                      <td style={{ minWidth: 140 }}>
                        {canManage ? (
                          <input
                            key={`${member.id}-${member.department ?? ""}`}
                            className="form-control form-control-sm radius-8"
                            defaultValue={member.department ?? ""}
                            list="workiz-departments"
                            aria-label={`Department for ${member.email}`}
                            onBlur={(e) => {
                              const next = e.target.value.trim();
                              if (next !== (member.department ?? "")) void saveDepartment(member.id, next);
                            }}
                          />
                        ) : (
                          member.department || "—"
                        )}
                        {canManage ? (
                          <label className="d-flex align-items-center gap-2 mb-0 mt-8 text-sm">
                            <input
                              type="checkbox"
                              checked={Boolean(member.department_lead)}
                              onChange={(e) => {
                                void apiClient(`/orgs/members/${member.id}`, {
                                  method: "PATCH",
                                  body: JSON.stringify({ departmentLead: e.target.checked }),
                                })
                                  .then(() => refresh())
                                  .catch((err) => setError((err as Error).message));
                              }}
                            />
                            Department lead
                          </label>
                        ) : null}
                      </td>
                      <td>
                        <StatusBadge label={formatRole(member.role)} tone="info" />
                      </td>
                      <td>
                        {memberCourses.length === 0 ? "No course assigned yet" : null}
                        {memberCourses.map((row) => (
                          <div key={row.course_id} className="d-flex align-items-center gap-2 mb-4">
                            <span>{row.title}</span>
                            {canManage && row.source === "seat" ? (
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-danger-600 radius-8"
                                onClick={() => unassign(member.id, row.course_id)}
                              >
                                Unassign
                              </button>
                            ) : null}
                          </div>
                        ))}
                      </td>
                      {canManage ? (
                        <td style={{ minWidth: 280 }}>
                          <div className="d-flex flex-wrap gap-2">
                            <select
                              className="form-select form-select-sm radius-8"
                              aria-label={`Course for ${member.email}`}
                              value={pick[member.id] ?? ""}
                              onChange={(e) => setPick((current) => ({ ...current, [member.id]: e.target.value }))}
                            >
                              <option value="">Choose a course</option>
                              {catalog.map((course) => (
                                <option key={course.id} value={course.id}>
                                  {course.title}
                                </option>
                              ))}
                            </select>
                            <button className="btn btn-sm btn-primary-600 radius-8" type="button" onClick={() => assign(member.id)}>
                              Assign
                            </button>
                            <button className="btn btn-sm btn-outline-danger-600 radius-8" type="button" onClick={() => remove(member.id)}>
                              Remove
                            </button>
                          </div>
                        </td>
                      ) : null}
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {members.length === 0 ? <EmptyState message="No one has joined this company yet." /> : null}
            {members.length > 0 && visibleMembers.length === 0 ? <EmptyState message="No people match that search." /> : null}
          </div>
        </LearnDataCard>
      ) : null}
      {org && canManage ? (
        <div className="mt-24">
          <LearnDataCard title="Pending invites">
            {pending.length === 0 ? <EmptyState message="No invites waiting." /> : null}
            {pending.length > 0 ? (
              <div className="workiz-admin-table-wrap">
                <table className="table bordered-table mb-0">
                  <thead>
                    <tr>
                      <th>Email</th>
                      <th>Courses</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {pending.map((invite) => {
                      const titles = inviteAssignments.filter((row) => row.invite_id === invite.id);
                      return (
                        <tr key={invite.id}>
                          <td>
                            <div className="fw-medium text-primary-light">{invite.email}</div>
                            {invite.department ? <div className="text-sm text-secondary-light">{invite.department}</div> : null}
                          </td>
                          <td>{titles.length ? titles.map((row) => row.title).join(", ") : "No course yet"}</td>
                          <td style={{ minWidth: 280 }}>
                            <div className="d-flex flex-wrap gap-2">
                              <select
                                className="form-select form-select-sm radius-8"
                                aria-label={`Course for ${invite.email}`}
                                value={pick[invite.id] ?? ""}
                                onChange={(e) => setPick((current) => ({ ...current, [invite.id]: e.target.value }))}
                              >
                                <option value="">Choose a course</option>
                                {catalog.map((course) => (
                                  <option key={course.id} value={course.id}>
                                    {course.title}
                                  </option>
                                ))}
                              </select>
                              <button
                                className="btn btn-sm btn-primary-600 radius-8"
                                type="button"
                                onClick={() => assignInvite(invite.id)}
                              >
                                Assign
                              </button>
                              <button
                                className="btn btn-sm btn-outline-danger-600 radius-8"
                                type="button"
                                onClick={() => cancelInvite(invite.id)}
                              >
                                Cancel
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : null}
          </LearnDataCard>
        </div>
      ) : null}
      {org && canManage ? (
        <div className="mt-24">
          <form
            className="card radius-12 shadow-1 mb-24"
            onSubmit={(e) => {
              e.preventDefault();
              void apiClient("/orgs/note", { method: "PATCH", body: JSON.stringify({ note: companyNote.trim() || null }) })
                .then(() => setNotice("Dashboard note saved."))
                .catch((err) => setError((err as Error).message));
            }}
          >
            <div className="card-header border-bottom bg-base py-16 px-24">
              <h6 className="mb-0 fw-semibold">Dashboard note</h6>
            </div>
            <div className="card-body d-flex flex-column gap-3">
              <textarea
                className="form-control radius-8"
                rows={2}
                maxLength={280}
                value={companyNote}
                onChange={(e) => setCompanyNote(e.target.value)}
                placeholder="Safety course is due Friday"
              />
              <button className="btn btn-primary-600 radius-8 align-self-start" type="submit">
                Save note
              </button>
            </div>
          </form>
          <LearnDataCard title="Activity">
            {activity.length === 0 ? <EmptyState message="Invites, assignments, and removals show up here." /> : null}
            {activity.length > 0 ? (
              <ul className="mb-0">
                {activity.map((event) => (
                  <li key={event.id} className="mb-8">
                    <span className="fw-medium">{event.action}</span>
                    {event.detail ? ` · ${event.detail}` : ""}
                    <div className="text-sm text-secondary-light">
                      {event.actorName || "Someone"} · {event.createdAt.slice(0, 16).replace("T", " ")}
                    </div>
                  </li>
                ))}
              </ul>
            ) : null}
          </LearnDataCard>
        </div>
      ) : null}
      {org && canViewProgress ? (
        <div className="mt-24">
          <LearnDataCard
            title="Progress"
            toolbar={
              <div className="d-flex flex-wrap gap-3 align-items-center">
                <select
                  className="form-select form-select-sm radius-8"
                  aria-label="Filter by department"
                  value={progressDept}
                  onChange={(e) => setProgressDept(e.target.value)}
                  style={{ width: 180 }}
                >
                  <option value="">All departments</option>
                  {departmentNames.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
                <label className="d-flex align-items-center gap-2 mb-0 text-sm">
                  <input type="checkbox" checked={notStartedOnly} onChange={(e) => setNotStartedOnly(e.target.checked)} />
                  Not started
                </label>
                <button className="btn btn-outline-primary-600 btn-sm radius-8" type="button" onClick={() => downloadProgress(progressRows)}>
                  Download spreadsheet
                </button>
              </div>
            }
          >
            {progress.length === 0 ? <EmptyState message="Progress shows up after people join." /> : null}
            {progress.length > 0 && progressRows.length === 0 ? <EmptyState message="No one matches that filter." /> : null}
            {progressRows.length > 0 ? (
              <div className="workiz-admin-table-wrap">
                <table className="table bordered-table mb-0">
                  <thead>
                    <tr>
                      <th>Person</th>
                      <th>Department</th>
                      <th>Course</th>
                      <th>Lessons</th>
                      <th>Time</th>
                      <th>Last lesson</th>
                      <th>Due</th>
                      <th>Quiz</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {progressRows.flatMap((person) => {
                      const courses = person.courses.length
                        ? person.courses
                        : [{ courseId: "none", title: "No course assigned", done: 0, total: 0, status: "not_started", lastLesson: null, lastAt: null }];
                      const visibleCourses = notStartedOnly
                        ? courses.filter((course) => course.courseId === "none" || course.status === "not_started" || course.status === "no_lessons")
                        : courses;
                      return visibleCourses.map((course, index) => {
                        const badge = course.courseId === "none" ? { label: "Waiting", tone: "neutral" as const } : progressLabel(course.status);
                        const due = dueBadge(course.dueStatus);
                        const quizTone = course.quizStatus === "failed" ? "danger" as const : course.quizStatus === "passed" ? "success" as const : "neutral" as const;
                        return (
                          <tr key={`${person.userId}-${course.courseId}`}>
                            <td>
                              {index === 0 ? (
                                <>
                                  <div className="fw-medium text-primary-light">{person.name || "Learner"}</div>
                                  <div className="text-sm text-secondary-light">{person.email}</div>
                                </>
                              ) : null}
                            </td>
                            <td>{index === 0 ? person.department || "—" : null}</td>
                            <td>{course.title}</td>
                            <td>{course.courseId === "none" ? "—" : course.total ? `${course.done} / ${course.total}` : "—"}</td>
                            <td>{course.courseId === "none" ? "—" : formatSpent(course.secondsSpent)}</td>
                            <td>
                              {course.lastLesson ? (
                                <>
                                  <div>{course.lastLesson}</div>
                                  {course.lastAt ? <div className="text-sm text-secondary-light">{course.lastAt.slice(0, 10)}</div> : null}
                                </>
                              ) : (
                                "—"
                              )}
                            </td>
                            <td>
                              {course.dueAt ? <div>{course.dueAt}</div> : null}
                              {due ? <StatusBadge label={due.label} tone={due.tone} /> : "—"}
                            </td>
                            <td>
                              {course.quizStatus && course.quizStatus !== "none" ? (
                                <StatusBadge label={quizText(course)} tone={quizTone} />
                              ) : (
                                "—"
                              )}
                            </td>
                            <td>
                              <StatusBadge label={badge.label} tone={badge.tone} />
                            </td>
                          </tr>
                        );
                      });
                    })}
                  </tbody>
                </table>
              </div>
            ) : null}
          </LearnDataCard>
        </div>
      ) : null}
      {org && canManage ? (
        <div className="mt-24">
          <LearnDataCard title="Certificates">
            {certificates.length === 0 ? <EmptyState message="Certificates appear here when someone finishes a course." /> : null}
            {certificates.length > 0 ? (
              <div className="workiz-admin-table-wrap">
                <table className="table bordered-table mb-0">
                  <thead>
                    <tr>
                      <th>Person</th>
                      <th>Course</th>
                      <th>Number</th>
                      <th>Issued</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {certificates.map((certificate) => (
                      <tr key={certificate.id}>
                        <td>
                          <div className="fw-medium text-primary-light">{certificate.name || "Learner"}</div>
                          <div className="text-sm text-secondary-light">{certificate.email}</div>
                        </td>
                        <td>{certificate.courseTitle}</td>
                        <td>{certificate.number || "—"}</td>
                        <td>{certificate.issuedAt.slice(0, 10)}</td>
                        <td className="text-end">
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-primary-600 radius-8"
                            disabled={downloading === certificate.id}
                            onClick={() => {
                              setDownloading(certificate.id);
                              const name = certificate.courseTitle.replace(/[^\w]+/g, "-");
                              downloadFile(`/me/certificates/${certificate.id}/pdf`, `${name}.pdf`)
                                .catch((err) => setError((err as Error).message))
                                .finally(() => setDownloading(null));
                            }}
                          >
                            {downloading === certificate.id ? "Preparing…" : "Download"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </LearnDataCard>
        </div>
      ) : null}
    </LearnShell>
  );
}
