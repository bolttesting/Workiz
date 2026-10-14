"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import Hls from "hls.js";
import { CourseAsk } from "@/components/CourseAsk";
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
  const [speed, setSpeed] = useState(1);
  const [note, setNote] = useState("");
  const [noteState, setNoteState] = useState<"idle" | "saving" | "saved">("idle");
  const [captionUrl, setCaptionUrl] = useState<string | null>(null);
  const [courseFinished, setCourseFinished] = useState(false);
  const [preview, setPreview] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const previewRef = useRef(false);
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
      apiClient<{ profile: { role: string } }>("/me").catch(() => ({ profile: { role: "" } })),
    ])
      .then(([res, progress, me]) => {
        if (cancelled) return;
        const looking = me.profile.role === "company_admin";
        previewRef.current = looking;
        setPreview(looking);
        const ordered = res.modules.flatMap((mod) => res.lessons.filter((lesson) => lesson.module_id === mod.id));
        const done = new Set(
          looking ? [] : progress.progress.filter((row) => row.completed).map((row) => row.lesson_id),
        );
        const positions: Record<string, number> = {};
        if (!looking) {
          for (const row of progress.progress) {
            if (!row.completed && row.position_seconds && row.position_seconds > 2) positions[row.lesson_id] = row.position_seconds;
          }
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
  const captionFile = activeResources.find(
    (file) => file.content_type.includes("vtt") || file.title.toLowerCase().endsWith(".vtt"),
  );
  const handouts = activeResources.filter((file) => file.id !== captionFile?.id);
  const activeDone = active ? completed.has(active.id) : false;

  useEffect(() => {
    if (!activeId || preview) return;
    setNote("");
    setNoteState("idle");
    apiClient<{ note: string }>(`/me/lessons/${activeId}/note`)
      .then((res) => setNote(res.note))
      .catch(() => setNote(""));
  }, [activeId, preview]);

  useEffect(() => {
    if (!captionFile) {
      setCaptionUrl(null);
      return;
    }
    let cancelled = false;
    apiClient<{ url: string }>(`/media/resources/${captionFile.id}/download`)
      .then((res) => {
        if (!cancelled) setCaptionUrl(res.url);
      })
      .catch(() => {
        if (!cancelled) setCaptionUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [captionFile?.id]);

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
      const nextDone = new Set(completed).add(lessonId);
      setCompleted(nextDone);
      const index = ordered.findIndex((lesson) => lesson.id === lessonId);
      const upcoming = ordered[index + 1];
      if (upcoming) setActiveId(upcoming.id);
      else if (ordered.length > 0 && ordered.every((lesson) => nextDone.has(lesson.id))) setCourseFinished(true);
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
              : "This course is not open for you yet. Ask your admin to assign it, or buy it for yourself."}
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
          <div className="workiz-player">
            <aside className="workiz-player-outline" aria-label="Curriculum">
              <Link href={preview ? "/catalog" : "/my-courses"} className="workiz-course__back">
                {preview ? "Catalog" : "My courses"}
              </Link>
              <h1>{course.title}</h1>
              {course.subtitle ? <p className="workiz-course__lede">{course.subtitle}</p> : null}
              <div className="workiz-player-outline__head">
                <h2>Lessons</h2>
                {preview ? null : (
                  <span>
                    {doneCount} / {ordered.length}
                  </span>
                )}
              </div>
              {preview ? null : (
                <div className="workiz-player-bar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
                  <span style={{ width: `${pct}%` }} />
                </div>
              )}
              <div className="workiz-player-lessons">
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
              </div>
              {!preview && pct === 100 && ordered.length > 0 ? (
                <Link href="/certificates" className="btn btn-primary-600 btn-sm radius-8 workiz-course__cert">
                  View certificate
                </Link>
              ) : null}
            </aside>
            <section className="workiz-player-stage" aria-label="Lesson">
              {active ? (
                <>
                  {active.type === "video" ? (
                    <div className="workiz-player-screen">
                      <video
                        ref={videoRef}
                        key={`${active.id}-${captionUrl ?? "plain"}`}
                        controls
                        className="workiz-player-video"
                        onLoadedMetadata={(event) => {
                          event.currentTarget.playbackRate = speed;
                        }}
                        onTimeUpdate={() => {
                          const video = videoRef.current;
                          if (!video || !slug || previewRef.current) return;
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
                        onEnded={() => {
                          if (!previewRef.current) void completeLesson(active.id);
                        }}
                      >
                        {captionUrl ? <track kind="subtitles" src={captionUrl} srcLang="en" label="English" default /> : null}
                      </video>
                    </div>
                  ) : null}

                  {active.type === "article" ? (
                    <div className="workiz-player-article" dangerouslySetInnerHTML={{ __html: active.article_content || "<p>This reading is empty.</p>" }} />
                  ) : null}

                  {active.type === "quiz" && active.quiz_id ? (
                    preview ? (
                      <p className="text-secondary-light mb-0">Learners take this quiz. A preview does not record a score.</p>
                    ) : (
                      <QuizBlock quizId={active.quiz_id} onPassed={() => setCompleted((current) => new Set(current).add(active.id))} />
                    )
                  ) : null}

                  <div className="workiz-player-dock">
                    <div className="workiz-player-dock__copy">
                      <h2>{active.title}</h2>
                      <p>
                        {typeLabel[active.type]}
                        {ordered.length ? ` · Lesson ${activeIndex + 1} of ${ordered.length}` : ""}
                      </p>
                    </div>
                    <div className="workiz-player-dock__actions">
                      {active.type === "video" ? (
                        <div className="btn-group btn-group-sm" role="group" aria-label="Playback speed">
                          {[1, 1.25, 1.5].map((rate) => (
                            <button
                              key={rate}
                              type="button"
                              className={`btn btn-sm radius-8 ${speed === rate ? "btn-primary-600" : "btn-outline-primary-600"}`}
                              onClick={() => {
                                setSpeed(rate);
                                if (videoRef.current) videoRef.current.playbackRate = rate;
                              }}
                            >
                              {rate}×
                            </button>
                          ))}
                        </div>
                      ) : null}
                      {!preview && activeDone ? <StatusBadge label="Complete" tone="success" /> : null}
                      {!preview && active.type !== "quiz" ? (
                        <button
                          type="button"
                          className="btn btn-primary-600 btn-sm radius-8"
                          disabled={activeDone || saving}
                          onClick={() => void completeLesson(active.id)}
                        >
                          {activeDone ? "Completed" : saving ? "Saving…" : "Mark complete"}
                        </button>
                      ) : null}
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

                  {!preview && courseFinished ? (
                    <div className="alert alert-success radius-8 mt-16" role="status">
                      You finished this course.
                      <Link href="/certificates" className="fw-semibold ms-8">
                        View certificate
                      </Link>
                    </div>
                  ) : null}
                  {handouts.length ? (
                    <div className="workiz-player-files">
                      {handouts.map((file) => (
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
                  {preview ? null : (
                  <form
                    className="mt-16"
                    onSubmit={(event) => {
                      event.preventDefault();
                      if (!active) return;
                      setNoteState("saving");
                      void apiClient(`/me/lessons/${active.id}/note`, {
                        method: "PUT",
                        body: JSON.stringify({ body: note }),
                      })
                        .then(() => setNoteState("saved"))
                        .catch((err) => {
                          setNoteState("idle");
                          setError((err as Error).message);
                        });
                    }}
                  >
                    <label className="form-label" htmlFor="lesson-note">
                      Your notes
                    </label>
                    <textarea
                      id="lesson-note"
                      className="form-control radius-8"
                      rows={3}
                      value={note}
                      onChange={(event) => {
                        setNote(event.target.value);
                        setNoteState("idle");
                      }}
                      placeholder="Only you can see these."
                    />
                    <button type="submit" className="btn btn-outline-primary-600 btn-sm radius-8 mt-8" disabled={noteState === "saving"}>
                      {noteState === "saving" ? "Saving…" : noteState === "saved" ? "Saved" : "Save note"}
                    </button>
                  </form>
                  )}
                  {preview ? null : <CourseAsk slug={slug} />}
                </>
              ) : (
                <p className="workiz-player-empty">This course has no lessons yet.</p>
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
  const [started, setStarted] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<{ score: number; passed: boolean; lessonTitle?: string | null; missed?: { id: string; prompt: string }[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setData(null);
    setStarted(false);
    setAnswers({});
    setResult(null);
    apiClient<QuizPayload>(`/quizzes/${quizId}`)
      .then(setData)
      .catch((err) => setError((err as Error).message));
  }, [quizId]);

  const answered = Boolean(data && data.questions.length > 0 && data.questions.every((question) => answers[question.id]));

  async function submit() {
    if (!data || submitting || !answered) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await apiClient<{ score: number; passed: boolean; lessonTitle?: string | null; missed?: { id: string; prompt: string }[] }>(`/quizzes/${quizId}/attempt`, {
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

  if (!started) {
    return (
      <div className="workiz-player-quiz">
        <h3>
          {data.quiz.title}
          <span className="text-secondary-light fw-medium"> · pass at {data.quiz.passing_score}%</span>
        </h3>
        <p className="text-secondary-light mb-0">
          {data.questions.length} question{data.questions.length === 1 ? "" : "s"}. Choose one answer for each, then submit.
        </p>
        <div>
          <button type="button" className="btn btn-primary-600 btn-sm radius-8" onClick={() => setStarted(true)}>
            Start quiz
          </button>
        </div>
      </div>
    );
  }

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
              <label key={option.id} className={`workiz-player-option${answers[question.id] === option.id ? " is-selected" : ""}`}>
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
              Score {result.score}%. Pass mark is {data.quiz.passing_score}%. Restudy {result.lessonTitle || "this lesson"} and try again.
            </p>
            {result.missed?.length ? (
              <ul className="mb-8">
                {result.missed.map((question) => (
                  <li key={question.id}>{question.prompt}</li>
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
          <>
            <button type="button" className="btn btn-primary-600 btn-sm radius-8" disabled={submitting || !answered} onClick={() => void submit()}>
              {submitting ? "Submitting…" : "Submit quiz"}
            </button>
            {!answered ? <p className="text-sm text-secondary-light mt-8 mb-0">Select an answer before submitting.</p> : null}
          </>
        )}
      </div>
    </div>
  );
}
