"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import Hls from "hls.js";
import { LearnShell } from "@/components/LearnShell";
import { LoadingState, StatusBadge } from "@/components/LearnUi";
import { apiClient } from "@/lib/api";
import type { Course, Lesson, ModuleRow } from "@workix/db/types";

type QuizPayload = {
  quiz: { id: string; title: string; passing_score: number };
  questions: { id: string; prompt: string }[];
  options: { id: string; question_id: string; label: string }[];
};

type LessonResourceMeta = {
  id: string;
  lesson_id: string;
  title: string;
  content_type: string;
  byte_size: number | null;
  sort_order: number;
};

const typeLabel: Record<Lesson["type"], string> = {
  video: "Video",
  article: "Reading",
  quiz: "Quiz",
};

function lessonIcon(lesson: Lesson, done: boolean) {
  if (done) return "ri-checkbox-circle-fill";
  if (lesson.type === "video") return "ri-play-circle-line";
  if (lesson.type === "quiz") return "ri-questionnaire-line";
  return "ri-article-line";
}

export default function PlayerPage() {
  const { slug } = useParams<{ slug: string }>();
  const [course, setCourse] = useState<Course | null>(null);
  const [unlocked, setUnlocked] = useState(false);
  const [waitingOn, setWaitingOn] = useState<{ title: string; slug: string } | null>(null);
  const [modules, setModules] = useState<ModuleRow[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [resources, setResources] = useState<LessonResourceMeta[]>([]);
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const positionsRef = useRef<Record<string, number>>({});
  const lastSavedRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      apiClient<{
        course: Course;
        modules: ModuleRow[];
        lessons: Lesson[];
        resources?: LessonResourceMeta[];
        unlocked?: boolean;
        waitingOn?: { title: string; slug: string } | null;
      }>(`/courses/${slug}`),
      apiClient<{ progress: { lesson_id: string; completed: boolean; position_seconds?: number }[] }>("/me/progress").catch(() => ({
        progress: [] as { lesson_id: string; completed: boolean; position_seconds?: number }[],
      })),
    ])
      .then(([res, progress]) => {
        if (cancelled) return;
        const ordered = res.modules.flatMap((mod) => res.lessons.filter((lesson) => lesson.module_id === mod.id));
        const done = new Set(progress.progress.filter((row) => row.completed).map((row) => row.lesson_id));
        const positions: Record<string, number> = {};
        for (const row of progress.progress) {
          if (!row.completed && row.position_seconds && row.position_seconds > 2) positions[row.lesson_id] = row.position_seconds;
        }
        positionsRef.current = positions;
        const resume = ordered.find((lesson) => !done.has(lesson.id)) ?? ordered[0] ?? null;
        setCourse(res.course);
        setUnlocked(Boolean(res.unlocked));
        setWaitingOn(res.waitingOn ?? null);
        setModules(res.modules);
        setLessons(res.lessons);
        setResources(res.resources ?? []);
        setCompleted(done);
        setActiveId(resume?.id ?? null);
        setError(null);
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
  }, [slug]);

  const ordered = useMemo(
    () => modules.flatMap((mod) => lessons.filter((lesson) => lesson.module_id === mod.id)),
    [modules, lessons],
  );
  const active = ordered.find((lesson) => lesson.id === activeId) ?? null;
  const activeIndex = active ? ordered.findIndex((lesson) => lesson.id === active.id) : -1;
  const previous = activeIndex > 0 ? ordered[activeIndex - 1] : null;
  const next = activeIndex >= 0 && activeIndex < ordered.length - 1 ? ordered[activeIndex + 1] : null;
  const doneCount = ordered.filter((lesson) => completed.has(lesson.id)).length;
  const pct = ordered.length ? Math.round((doneCount / ordered.length) * 100) : 0;
  const activeResources = active ? resources.filter((file) => file.lesson_id === active.id) : [];
  const activeDone = active ? completed.has(active.id) : false;

  useEffect(() => {
    if (!active || active.type !== "video" || !unlocked) return;
    let hls: Hls | null = null;
    const lessonId = active.id;
    (async () => {
      try {
        const playback = await apiClient<{ url: string; type: string }>(`/media/lessons/${lessonId}/playback`);
        const video = videoRef.current;
        if (!video) return;
        const startAt = positionsRef.current[lessonId] ?? 0;
        const seek = () => {
          if (startAt > 2 && (!video.duration || startAt < video.duration - 1)) video.currentTime = startAt;
        };
        if (playback.type === "hls" && Hls.isSupported()) {
          hls = new Hls();
          hls.loadSource(playback.url);
          hls.attachMedia(video);
          hls.on(Hls.Events.MANIFEST_PARSED, () => video.addEventListener("loadedmetadata", seek, { once: true }));
        } else {
          video.src = playback.url;
          video.addEventListener("loadedmetadata", seek, { once: true });
        }
        lastSavedRef.current = startAt;
      } catch (err) {
        setError((err as Error).message);
      }
    })();
    return () => hls?.destroy();
  }, [active, unlocked]);

  async function completeLesson(lessonId: string) {
    if (!slug || completed.has(lessonId)) return;
    setSaving(true);
    setError(null);
    try {
      await apiClient(`/courses/${slug}/progress`, {
        method: "POST",
        body: JSON.stringify({ lessonId, completed: true }),
      });
      setCompleted((current) => new Set(current).add(lessonId));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function downloadResource(resourceId: string) {
    setDownloading(resourceId);
    setError(null);
    try {
      const { url, title } = await apiClient<{ url: string; title: string }>(`/media/resources/${resourceId}/download`);
      const a = document.createElement("a");
      a.href = url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.download = title.endsWith(".pdf") ? title : `${title}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setDownloading(null);
    }
  }

  return (
    <LearnShell>
      {error ? (
        <div className="alert alert-danger radius-8 mb-16" role="alert">
          {error}
        </div>
      ) : null}
      {loading ? <LoadingState message="Loading course…" /> : null}
      {!loading && course && !unlocked ? (
        <div className="workiz-player-stage workiz-player-lock">
          <h2 className="mb-8">{waitingOn ? "This course opens later" : "This course is locked"}</h2>
          <p className="text-secondary-light mb-16">
            {waitingOn
              ? `Finish ${waitingOn.title} first. Your company set opens this course after that one.`
              : "Buy it, or open it from a company seat, before the lessons will play."}
          </p>
          {waitingOn ? (
            <Link href={`/courses/${waitingOn.slug}`} className="btn btn-primary-600 radius-8">
              Open {waitingOn.title}
            </Link>
          ) : (
            <Link href="/catalog" className="btn btn-primary-600 radius-8">
              Browse catalog
            </Link>
          )}
        </div>
      ) : null}
      {!loading && course && unlocked ? (
        <div className="workiz-course">
          <header className="workiz-course__bar">
            <div>
              <Link href="/my-courses" className="workiz-course__back">
                My courses
              </Link>
              <h1>{course.title}</h1>
              {course.subtitle ? <p>{course.subtitle}</p> : null}
            </div>
            <span className="workiz-dash-panel__pill">
              {doneCount} / {ordered.length} lessons
            </span>
          </header>
          <div className="workiz-player">
          <aside className="workiz-player-outline" aria-label="Curriculum">
            <div className="workiz-player-outline__head">
              <h2>Lessons</h2>
              <span>{pct}%</span>
            </div>
            <div className="workiz-player-bar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
              <span style={{ width: `${pct}%` }} />
            </div>
            {modules.map((mod) => {
              const items = lessons.filter((lesson) => lesson.module_id === mod.id);
              if (!items.length) return null;
              return (
                <div key={mod.id}>
                  <p className="workiz-player-module">{mod.title}</p>
                  {items.map((lesson) => {
                    const done = completed.has(lesson.id);
                    const current = lesson.id === active?.id;
                    return (
                      <button
                        key={lesson.id}
                        type="button"
                        className={`workiz-player-lesson${current ? " is-active" : ""}${done ? " is-done" : ""}`}
                        aria-current={current ? "true" : undefined}
                        onClick={() => setActiveId(lesson.id)}
                      >
                        <i className={lessonIcon(lesson, done)} aria-hidden="true" />
                        <span>{lesson.title}</span>
                      </button>
                    );
                  })}
                </div>
              );
            })}
            {pct === 100 && ordered.length > 0 ? (
              <p className="text-secondary-light text-sm px-8 mb-0 mt-12">
                Course finished. <Link href="/certificates">Certificates</Link>
              </p>
            ) : null}
          </aside>
          <section className="workiz-player-stage" aria-label="Lesson">
            {active ? (
              <>
                <div className="workiz-player-stage__head">
                  <div>
                    <h2>{active.title}</h2>
                    <p className="workiz-player-stage__type">
                      {typeLabel[active.type]}
                      {ordered.length ? ` · Lesson ${activeIndex + 1} of ${ordered.length}` : ""}
                    </p>
                  </div>
                  {activeDone ? <StatusBadge label="Complete" tone="success" /> : null}
                </div>

                {active.type === "video" ? (
                  <video
                    ref={videoRef}
                    controls
                    className="workiz-player-video"
                    onTimeUpdate={() => {
                      const video = videoRef.current;
                      if (!video || !slug) return;
                      const seconds = Math.floor(video.currentTime);
                      if (seconds < 3 || Math.abs(seconds - lastSavedRef.current) < 8) return;
                      const spent = Math.min(20, Math.max(0, seconds - lastSavedRef.current));
                      lastSavedRef.current = seconds;
                      positionsRef.current[active.id] = seconds;
                      void apiClient(`/courses/${slug}/progress`, {
                        method: "POST",
                        body: JSON.stringify({ lessonId: active.id, positionSeconds: seconds, spentSeconds: spent }),
                      }).catch(() => undefined);
                    }}
                    onEnded={() => void completeLesson(active.id)}
                  />
                ) : null}

                {active.type === "article" ? (
                  <div className="workiz-player-article" dangerouslySetInnerHTML={{ __html: active.article_content || "<p>This reading is empty.</p>" }} />
                ) : null}

                {active.type === "quiz" && active.quiz_id ? (
                  <QuizBlock quizId={active.quiz_id} onPassed={() => setCompleted((current) => new Set(current).add(active.id))} />
                ) : null}

                {activeResources.length ? (
                  <div className="workiz-player-files">
                    {activeResources.map((file) => (
                      <button
                        key={file.id}
                        type="button"
                        className="btn btn-outline-primary-600 btn-sm radius-8"
                        disabled={downloading === file.id}
                        onClick={() => void downloadResource(file.id)}
                      >
                        <i className="ri-file-pdf-line me-4" aria-hidden="true" />
                        {downloading === file.id ? "Preparing…" : file.title}
                      </button>
                    ))}
                  </div>
                ) : null}

                <div className="workiz-player-nav">
                  {active.type !== "quiz" ? (
                    <button
                      type="button"
                      className="btn btn-primary-600 btn-sm radius-8"
                      disabled={activeDone || saving}
                      onClick={() => void completeLesson(active.id)}
                    >
                      {activeDone ? "Completed" : saving ? "Saving…" : "Mark complete"}
                    </button>
                  ) : (
                    <span />
                  )}
                  <div className="workiz-player-nav__step">
                    <button
                      type="button"
                      className="btn btn-outline-primary-600 btn-sm radius-8"
                      disabled={!previous}
                      onClick={() => previous && setActiveId(previous.id)}
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline-primary-600 btn-sm radius-8"
                      disabled={!next}
                      onClick={() => next && setActiveId(next.id)}
                    >
                      Next
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-secondary-light mb-0 px-16">This course has no lessons yet.</p>
            )}
          </section>
          </div>
        </div>
      ) : null}
    </LearnShell>
  );
}

function QuizBlock({ quizId, onPassed }: { quizId: string; onPassed: () => void }) {
  const [data, setData] = useState<QuizPayload | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<{ score: number; passed: boolean; missed?: { id: string; prompt: string }[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setData(null);
    setAnswers({});
    setResult(null);
    apiClient<QuizPayload>(`/quizzes/${quizId}`)
      .then(setData)
      .catch((err) => setError((err as Error).message));
  }, [quizId]);

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await apiClient<{ score: number; passed: boolean; missed?: { id: string; prompt: string }[] }>(`/quizzes/${quizId}/attempt`, {
        method: "POST",
        body: JSON.stringify({ answers }),
      });
      setResult(res);
      if (res.passed) onPassed();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  if (error) return <p className="text-danger mb-0">{error}</p>;
  if (!data) return <p className="text-secondary-light mb-0">Loading quiz…</p>;

  return (
    <div className="workiz-player-quiz">
      <h3>
        {data.quiz.title}
        <span className="text-secondary-light fw-medium"> · pass at {data.quiz.passing_score}%</span>
      </h3>
      {data.questions.map((question, index) => (
        <fieldset key={question.id} className="workiz-player-question">
          <p>
            {index + 1}. {question.prompt}
          </p>
          {data.options
            .filter((option) => option.question_id === question.id)
            .map((option) => (
              <label key={option.id} className="workiz-player-option">
                <input
                  type="radio"
                  name={question.id}
                  checked={answers[question.id] === option.id}
                  onChange={() => setAnswers((current) => ({ ...current, [question.id]: option.id }))}
                />
                <span>{option.label}</span>
              </label>
            ))}
        </fieldset>
      ))}
      <div>
        {result?.passed ? (
          <p className="mt-12 mb-0">Score {result.score}%. Passed.</p>
        ) : result ? (
          <>
            <p className="mt-12 mb-8">
              Score {result.score}%. Pass mark is {data.quiz.passing_score}%. This lesson stays open until you pass.
            </p>
            {result.missed?.length ? (
              <ul className="mb-8">
                {result.missed.map((question) => (
                  <li key={question.id}>Missed: {question.prompt}</li>
                ))}
              </ul>
            ) : null}
            <button
              type="button"
              className="btn btn-outline-primary-600 btn-sm radius-8"
              onClick={() => {
                setResult(null);
                setAnswers({});
              }}
            >
              Try again
            </button>
          </>
        ) : (
          <button type="button" className="btn btn-primary-600 btn-sm radius-8" disabled={submitting} onClick={() => void submit()}>
            {submitting ? "Submitting…" : "Submit quiz"}
          </button>
        )}
      </div>
    </div>
  );
}
