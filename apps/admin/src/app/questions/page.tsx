"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AdminShell } from "@/components/AdminShell";
import { AdminPageHeader, EmptyState, LoadingState, StatusBadge } from "@/components/AdminUi";
import { apiClient } from "@/lib/api";

type QRow = {
  id: string;
  body: string;
  answer_body: string | null;
  created_at: string;
  course: { id: string; title: string; slug: string } | null;
  user: { full_name: string | null; email: string } | null;
};

export default function QuestionsAdminPage() {
  const [rows, setRows] = useState<QRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [unansweredOnly, setUnansweredOnly] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  async function refresh() {
    const res = await apiClient<{ questions: QRow[] }>(
      `/admin/questions${unansweredOnly ? "?unanswered=1" : ""}`,
    );
    setRows(res.questions);
  }

  useEffect(() => {
    setLoading(true);
    refresh()
      .then(() => setError(null))
      .catch((err) => setError((err as Error).message))
      .finally(() => setLoading(false));
  }, [unansweredOnly]);

  async function answer(id: string) {
    const text = (drafts[id] || "").trim();
    if (!text) return;
    setBusyId(id);
    setError(null);
    try {
      await apiClient(`/admin/questions/${id}/answer`, {
        method: "POST",
        body: JSON.stringify({ answer_body: text }),
      });
      setDrafts((prev) => ({ ...prev, [id]: "" }));
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
        title="Questions"
        description="Reply to learner questions about courses. Answers show on the course page."
        action={
          <label className="d-flex align-items-center gap-2 mb-0">
            <input
              type="checkbox"
              checked={unansweredOnly}
              onChange={(e) => setUnansweredOnly(e.target.checked)}
            />
            Unanswered only
          </label>
        }
      />

      {error ? (
        <div className="alert alert-danger radius-8 mb-24" role="alert">
          {error}
        </div>
      ) : null}
      {loading ? <LoadingState /> : null}

      {!loading ? (
        <div className="d-flex flex-column gap-3">
          {rows.map((q) => (
            <article key={q.id} className="card radius-12 shadow-1">
              <div className="card-body">
                <div className="d-flex flex-wrap justify-content-between gap-2 mb-12">
                  <div>
                    <StatusBadge label={q.answer_body ? "Answered" : "Open"} tone={q.answer_body ? "success" : "warning"} />
                    <span className="ms-12 text-sm text-secondary-light">
                      {q.user?.full_name || q.user?.email || "Learner"} · {q.created_at.slice(0, 10)}
                    </span>
                  </div>
                  {q.course ? (
                    <Link href={`/courses/${q.course.id}`} className="text-sm fw-semibold">
                      {q.course.title}
                    </Link>
                  ) : null}
                </div>
                <p className="mb-16">{q.body}</p>
                {q.answer_body ? (
                  <div className="border radius-8 p-16 bg-neutral-50">
                    <p className="text-sm text-secondary-light mb-4">Your reply</p>
                    <p className="mb-0">{q.answer_body}</p>
                  </div>
                ) : (
                  <div>
                    <textarea
                      className="form-control radius-8 mb-12"
                      rows={3}
                      placeholder="Write an answer…"
                      value={drafts[q.id] || ""}
                      onChange={(e) => setDrafts((prev) => ({ ...prev, [q.id]: e.target.value }))}
                    />
                    <button
                      type="button"
                      className="btn btn-primary-600 radius-8"
                      disabled={busyId === q.id}
                      onClick={() => answer(q.id)}
                    >
                      {busyId === q.id ? "Saving…" : "Post answer"}
                    </button>
                  </div>
                )}
              </div>
            </article>
          ))}
          {rows.length === 0 ? <EmptyState message="No questions in this filter." /> : null}
        </div>
      ) : null}
    </AdminShell>
  );
}
