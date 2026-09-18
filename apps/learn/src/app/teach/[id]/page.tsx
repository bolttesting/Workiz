"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { LearnShell } from "@/components/LearnShell";
import { apiClient } from "@/lib/api";

type Student = {
  id: string;
  full_name: string | null;
  email: string;
  source: string;
  completion: number;
  finished: boolean;
};

export default function TeachStudentsPage() {
  const { id } = useParams<{ id: string }>();
  const [students, setStudents] = useState<Student[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiClient<{ students: Student[] }>(`/instructor/courses/${id}/students`)
      .then((r) => setStudents(r.students))
      .catch((err) => setError((err as Error).message));
  }, [id]);

  return (
    <LearnShell>
      <div className="d-flex align-items-center justify-content-between mb-24">
        <h6 className="mb-0">Students</h6>
        <Link href="/teach">Back to teaching</Link>
      </div>
      {error ? <p className="text-danger">{error}</p> : null}
      <div className="card radius-12">
        <table className="table mb-0">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Access</th>
              <th>Completion</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s) => (
              <tr key={s.id}>
                <td>{s.full_name}</td>
                <td>{s.email}</td>
                <td>{s.source}</td>
                <td>{s.completion}%</td>
                <td>{s.finished ? "Finished" : "In progress"}</td>
              </tr>
            ))}
            {students.length === 0 && !error ? (
              <tr>
                <td colSpan={5}>No students enrolled yet.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </LearnShell>
  );
}
