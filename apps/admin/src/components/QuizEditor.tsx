"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api";

type QuizOptionDraft = { label: string; is_correct: boolean };
type QuizQuestionDraft = { prompt: string; options: QuizOptionDraft[] };

type Props = {
  lessonId: string;
  onSaved?: () => void;
};

function emptyQuestion(): QuizQuestionDraft {
  return {
    prompt: "",
    options: [
      { label: "", is_correct: true },
      { label: "", is_correct: false },
    ],
  };
}

export function QuizEditor({ lessonId, onSaved }: Props) {
  const [title, setTitle] = useState("Lecture quiz");
  const [passingScore, setPassingScore] = useState(70);
  const [questions, setQuestions] = useState<QuizQuestionDraft[]>([emptyQuestion()]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    apiClient<{
      quiz: { title: string; passing_score: number } | null;
      questions: { id: string; prompt: string }[];
      options: { question_id: string; label: string; is_correct: boolean }[];
    }>(`/quizzes/admin/lessons/${lessonId}`)
      .then((res) => {
        if (cancelled) return;
        if (!res.quiz) {
          setTitle("Lecture quiz");
          setPassingScore(70);
          setQuestions([emptyQuestion()]);
          return;
        }
        setTitle(res.quiz.title || "Lecture quiz");
        setPassingScore(res.quiz.passing_score ?? 70);
        setQuestions(
          res.questions.map((q) => ({
            prompt: q.prompt,
            options: res.options
              .filter((o) => o.question_id === q.id)
              .map((o) => ({ label: o.label, is_correct: o.is_correct })),
          })),
        );
      })
      .catch((err) => {
        if (!cancelled) setError((err as Error).message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [lessonId]);

  function updateQuestion(index: number, patch: Partial<QuizQuestionDraft>) {
    setQuestions((prev) => prev.map((q, i) => (i === index ? { ...q, ...patch } : q)));
  }

  function updateOption(qIndex: number, oIndex: number, patch: Partial<QuizOptionDraft>) {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qIndex) return q;
        const options = q.options.map((o, j) => {
          if (j !== oIndex) {
            // Keep single correct answer when marking one correct
            if (patch.is_correct === true) return { ...o, is_correct: false };
            return o;
          }
          return { ...o, ...patch };
        });
        return { ...q, options };
      }),
    );
  }

  async function save() {
    setSaving(true);
    setError(null);
    setOk(null);
    try {
      const cleaned = questions
        .map((q) => ({
          prompt: q.prompt.trim(),
          options: q.options
            .map((o) => ({ label: o.label.trim(), is_correct: o.is_correct }))
            .filter((o) => o.label),
        }))
        .filter((q) => q.prompt && q.options.length >= 2);

      if (!cleaned.length) throw new Error("Add at least one question with two options.");
      for (const q of cleaned) {
        if (!q.options.some((o) => o.is_correct)) {
          throw new Error(`Mark a correct answer for: “${q.prompt}”`);
        }
      }

      await apiClient(`/quizzes/admin/lessons/${lessonId}`, {
        method: "PUT",
        body: JSON.stringify({
          title: title.trim() || "Lecture quiz",
          passing_score: passingScore,
          questions: cleaned,
        }),
      });
      setOk("Quiz saved.");
      onSaved?.();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-sm text-secondary-light mt-16 mb-0">Loading quiz…</p>;

  return (
    <div className="mt-16 border radius-12 p-16 bg-neutral-50">
      <div className="d-flex flex-wrap justify-content-between gap-2 mb-16">
        <h6 className="mb-0 fw-semibold">Quiz questions</h6>
        <span className="text-sm text-secondary-light">Learners see this in the learn app</span>
      </div>

      {error ? (
        <div className="alert alert-danger radius-8 mb-16" role="alert">
          {error}
        </div>
      ) : null}
      {ok ? (
        <div className="alert alert-success radius-8 mb-16" role="alert">
          {ok}
        </div>
      ) : null}

      <div className="row gy-3 mb-16">
        <div className="col-md-8">
          <label className="form-label">Quiz title</label>
          <input className="form-control radius-8" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="col-md-4">
          <label className="form-label">Passing score %</label>
          <input
            className="form-control radius-8"
            type="number"
            min={1}
            max={100}
            value={passingScore}
            onChange={(e) => setPassingScore(Number(e.target.value))}
          />
        </div>
      </div>

      {questions.map((q, qi) => (
        <div key={qi} className="border radius-8 p-16 mb-12 bg-base">
          <div className="d-flex justify-content-between gap-2 mb-12">
            <strong>Question {qi + 1}</strong>
            <button
              type="button"
              className="btn btn-sm btn-outline-danger-600 radius-8"
              disabled={questions.length <= 1}
              onClick={() => setQuestions((prev) => prev.filter((_, i) => i !== qi))}
            >
              Remove
            </button>
          </div>
          <label className="form-label">Prompt</label>
          <input
            className="form-control radius-8 mb-12"
            value={q.prompt}
            onChange={(e) => updateQuestion(qi, { prompt: e.target.value })}
            placeholder="What should the learner answer?"
          />
          <p className="text-sm text-secondary-light mb-8">Options (mark the correct one)</p>
          {q.options.map((opt, oi) => (
            <div key={oi} className="d-flex align-items-center gap-2 mb-8">
              <input
                type="radio"
                name={`correct-${lessonId}-${qi}`}
                checked={opt.is_correct}
                onChange={() => updateOption(qi, oi, { is_correct: true })}
                title="Correct answer"
              />
              <input
                className="form-control radius-8"
                value={opt.label}
                onChange={(e) => updateOption(qi, oi, { label: e.target.value })}
                placeholder={`Option ${oi + 1}`}
              />
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary radius-8"
                disabled={q.options.length <= 2}
                onClick={() =>
                  updateQuestion(qi, {
                    options: q.options.filter((_, i) => i !== oi),
                  })
                }
              >
                ×
              </button>
            </div>
          ))}
          <button
            type="button"
            className="btn btn-sm btn-outline-primary-600 radius-8"
            onClick={() =>
              updateQuestion(qi, {
                options: [...q.options, { label: "", is_correct: false }],
              })
            }
          >
            Add option
          </button>
        </div>
      ))}

      <div className="d-flex flex-wrap gap-2">
        <button type="button" className="btn btn-outline-primary-600 radius-8" onClick={() => setQuestions((p) => [...p, emptyQuestion()])}>
          Add question
        </button>
        <button type="button" className="btn btn-primary-600 radius-8" disabled={saving} onClick={save}>
          {saving ? "Saving…" : "Save quiz"}
        </button>
      </div>
    </div>
  );
}
