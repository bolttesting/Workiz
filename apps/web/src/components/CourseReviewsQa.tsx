"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createBrowserSupabase } from "@workix/db/browser";
import { apiClient } from "@/lib/api";

type Person = { id: string; full_name: string | null; avatar_url?: string | null; role?: string };
type Review = {
  id: string;
  rating: number;
  body: string;
  created_at: string;
  user: Person | null;
};
type Question = {
  id: string;
  body: string;
  answer_body: string | null;
  answered_at: string | null;
  created_at: string;
  user: Person | null;
  answerer: Person | null;
};

const webSignIn = `${process.env.NEXT_PUBLIC_WEB_URL || "http://localhost:3000"}/sign-in`;

function Stars({ value, onChange }: { value: number; onChange?: (n: number) => void }) {
  return (
    <div className="workiz-stars" role={onChange ? "radiogroup" : "img"} aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          className={`workiz-stars__btn${n <= value ? " is-on" : ""}`}
          aria-label={`${n} star${n === 1 ? "" : "s"}`}
          disabled={!onChange}
          onClick={() => onChange?.(n)}
        >
          ★
        </button>
      ))}
    </div>
  );
}

function LockedPrompt({
  slug,
  signedIn,
  action,
}: {
  slug: string;
  signedIn: boolean;
  action: "review" | "question";
}) {
  const label = action === "review" ? "leave a review" : "ask a question";
  if (!signedIn) {
    return (
      <p className="workiz-engage__signin">
        <Link href={`${webSignIn}?next=/courses/${slug}`}>Sign in</Link> after you buy this course to {label}. You can
        still read everything below.
      </p>
    );
  }
  return (
    <p className="workiz-engage__signin">
      Buy or enroll in this course to {label}. Reviews and questions stay visible to everyone.
    </p>
  );
}

export function CourseReviewsQa({ slug }: { slug: string }) {
  const [signedIn, setSignedIn] = useState(false);
  const [canPost, setCanPost] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [summary, setSummary] = useState({ count: 0, average: 0 });
  const [questions, setQuestions] = useState<Question[]>([]);
  const [rating, setRating] = useState(5);
  const [reviewBody, setReviewBody] = useState("");
  const [questionBody, setQuestionBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<"reviews" | "questions">("reviews");

  async function load() {
    const [r, q] = await Promise.all([
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/courses/${slug}/reviews`).then((res) => res.json()),
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/courses/${slug}/questions`).then((res) => res.json()),
    ]);
    setReviews(r.reviews ?? []);
    setSummary(r.summary ?? { count: 0, average: 0 });
    setQuestions(q.questions ?? []);
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const {
        data: { session },
      } = await createBrowserSupabase().auth.getSession();
      if (cancelled) return;
      const signed = Boolean(session);
      setSignedIn(signed);
      if (!signed) {
        setCanPost(false);
      } else {
        try {
          const res = await apiClient<{ unlocked: boolean }>(`/courses/${slug}`);
          if (!cancelled) setCanPost(Boolean(res.unlocked));
        } catch {
          if (!cancelled) setCanPost(false);
        }
      }
      try {
        await load();
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  async function submitReview(e: React.FormEvent) {
    e.preventDefault();
    if (!canPost) return;
    setBusy(true);
    setError(null);
    setOk(null);
    try {
      await apiClient(`/courses/${slug}/reviews`, {
        method: "POST",
        body: JSON.stringify({ rating, body: reviewBody }),
      });
      setReviewBody("");
      setOk("Review saved.");
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function submitQuestion(e: React.FormEvent) {
    e.preventDefault();
    if (!canPost) return;
    setBusy(true);
    setError(null);
    setOk(null);
    try {
      await apiClient(`/courses/${slug}/questions`, {
        method: "POST",
        body: JSON.stringify({ body: questionBody }),
      });
      setQuestionBody("");
      setOk("Question submitted. An instructor will reply soon.");
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="workiz-course-detail__block workiz-engage">
      <div className="workiz-engage__tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "reviews"}
          className={tab === "reviews" ? "is-active" : ""}
          onClick={() => setTab("reviews")}
        >
          Reviews {summary.count ? `(${summary.count})` : ""}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "questions"}
          className={tab === "questions" ? "is-active" : ""}
          onClick={() => setTab("questions")}
        >
          Questions {questions.length ? `(${questions.length})` : ""}
        </button>
      </div>

      {error ? <p className="workiz-engage__msg workiz-engage__msg--err">{error}</p> : null}
      {ok ? <p className="workiz-engage__msg workiz-engage__msg--ok">{ok}</p> : null}

      {tab === "reviews" ? (
        <div>
          <div className="workiz-engage__summary">
            <strong>{summary.average || "—"}</strong>
            <div>
              <Stars value={Math.round(summary.average || 0)} />
              <span>
                {summary.count} review{summary.count === 1 ? "" : "s"}
              </span>
            </div>
          </div>

          {canPost ? (
            <form className="workiz-engage__form" onSubmit={submitReview}>
              <label>Your rating</label>
              <Stars value={rating} onChange={setRating} />
              <label htmlFor="review-body">Your review</label>
              <textarea
                id="review-body"
                rows={3}
                value={reviewBody}
                onChange={(e) => setReviewBody(e.target.value)}
                placeholder="What helped you most in this course?"
                required
                minLength={8}
              />
              <button type="submit" disabled={busy}>
                {busy ? "Saving…" : "Post review"}
              </button>
            </form>
          ) : (
            <LockedPrompt slug={slug} signedIn={signedIn} action="review" />
          )}

          <ul className="workiz-engage__list">
            {reviews.map((r) => (
              <li key={r.id}>
                <div className="workiz-engage__meta">
                  <strong>{r.user?.full_name || "Learner"}</strong>
                  <Stars value={r.rating} />
                </div>
                <p>{r.body}</p>
              </li>
            ))}
            {!reviews.length ? <li className="workiz-engage__empty">No reviews yet.</li> : null}
          </ul>
        </div>
      ) : (
        <div>
          {canPost ? (
            <form className="workiz-engage__form" onSubmit={submitQuestion}>
              <label htmlFor="q-body">Ask a question</label>
              <textarea
                id="q-body"
                rows={3}
                value={questionBody}
                onChange={(e) => setQuestionBody(e.target.value)}
                placeholder="Ask the instructor or Workiz team about this course…"
                required
                minLength={8}
              />
              <button type="submit" disabled={busy}>
                {busy ? "Sending…" : "Ask question"}
              </button>
            </form>
          ) : (
            <LockedPrompt slug={slug} signedIn={signedIn} action="question" />
          )}

          <ul className="workiz-engage__list">
            {questions.map((q) => (
              <li key={q.id}>
                <div className="workiz-engage__meta">
                  <strong>{q.user?.full_name || "Learner"}</strong>
                  <span>{new Date(q.created_at).toLocaleDateString()}</span>
                </div>
                <p>{q.body}</p>
                {q.answer_body ? (
                  <div className="workiz-engage__answer">
                    <strong>{q.answerer?.full_name || "Instructor"}</strong>
                    <p>{q.answer_body}</p>
                  </div>
                ) : (
                  <p className="workiz-engage__pending">Awaiting reply</p>
                )}
              </li>
            ))}
            {!questions.length ? <li className="workiz-engage__empty">No questions yet.</li> : null}
          </ul>
        </div>
      )}
    </section>
  );
}
