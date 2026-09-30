"use client";

import { useCallback, useEffect, useState } from "react";
import { apiClient } from "@/lib/api";

type Person = { full_name: string | null };
type Question = {
  id: string;
  body: string;
  answer_body: string | null;
  created_at: string;
  user: Person | null;
};

export function CourseAsk({ slug }: { slug: string }) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await apiClient<{ questions: Question[] }>(`/courses/${slug}/questions`);
      setQuestions(res.questions ?? []);
    } catch {
      setQuestions([]);
    }
  }, [slug]);

  useEffect(() => {
    void load();
  }, [load]);

  async function ask(e: React.FormEvent) {
    e.preventDefault();
    const text = body.trim();
    if (text.length < 8) {
      setError("Write a question of at least a few words.");
      setOk(null);
      return;
    }
    setBusy(true);
    setError(null);
    setOk(null);
    try {
      await apiClient(`/courses/${slug}/questions`, {
        method: "POST",
        body: JSON.stringify({ body: text }),
      });
      setBody("");
      setOk("Question sent. A reply will show here.");
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="workiz-ask" aria-label="Questions">
      <h6 className="fw-semibold mb-4">Ask a question</h6>
      <p className="text-sm text-secondary-light mb-12">
        Stuck on this course? Ask here. Replies from the team show under your question.
      </p>
      <form onSubmit={(e) => void ask(e)}>
        <label className="visually-hidden" htmlFor="course-question">
          Your question
        </label>
        <textarea
          id="course-question"
          className="form-control radius-8"
          rows={3}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="What do you want to ask?"
        />
        <button type="submit" className="btn btn-primary-600 btn-sm radius-8 mt-12" disabled={busy}>
          {busy ? "Sending…" : "Ask"}
        </button>
      </form>
      {error ? <p className="text-danger text-sm mt-8 mb-0">{error}</p> : null}
      {ok ? <p className="text-sm mt-8 mb-0">{ok}</p> : null}
      {questions.length ? (
        <ul className="workiz-ask__list">
          {questions.map((question) => (
            <li key={question.id}>
              <p className="mb-4 fw-medium text-primary-light">{question.body}</p>
              <p className="text-sm text-secondary-light mb-0">
                {question.user?.full_name?.trim() || "Learner"} · {question.created_at.slice(0, 10)}
              </p>
              {question.answer_body ? <p className="workiz-ask__reply mb-0">{question.answer_body}</p> : null}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
