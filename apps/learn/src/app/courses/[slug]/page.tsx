"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Hls from "hls.js";
import { LearnShell } from "@/components/LearnShell";
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

export default function PlayerPage() {
  const { slug } = useParams<{ slug: string }>();
  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<ModuleRow[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [resources, setResources] = useState<LessonResourceMeta[]>([]);
  const [active, setActive] = useState<Lesson | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    apiClient<{
      course: Course;
      modules: ModuleRow[];
      lessons: Lesson[];
      resources?: LessonResourceMeta[];
    }>(`/courses/${slug}`)
      .then((res) => {
        setCourse(res.course);
        setModules(res.modules);
        setLessons(res.lessons);
        setResources(res.resources ?? []);
        setActive(res.lessons[0] ?? null);
      })
      .catch((err) => setError((err as Error).message));
  }, [slug]);

  useEffect(() => {
    if (!active || active.type !== "video") return;
    let hls: Hls | null = null;
    (async () => {
      try {
        const playback = await apiClient<{ url: string; type: string }>(`/media/lessons/${active.id}/playback`);
        const video = videoRef.current;
        if (!video) return;
        if (playback.type === "hls" && Hls.isSupported()) {
          hls = new Hls();
          hls.loadSource(playback.url);
          hls.attachMedia(video);
        } else {
          video.src = playback.url;
        }
      } catch (err) {
        setError((err as Error).message);
      }
    })();
    return () => hls?.destroy();
  }, [active]);

  async function completeLesson() {
    if (!active || !slug) return;
    await apiClient(`/courses/${slug}/progress`, {
      method: "POST",
      body: JSON.stringify({ lessonId: active.id, completed: true }),
    });
  }

  async function downloadResource(resourceId: string) {
    setDownloading(resourceId);
    setError(null);
    try {
      const { url, title } = await apiClient<{ url: string; title: string }>(
        `/media/resources/${resourceId}/download`,
      );
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

  const activeResources = active ? resources.filter((r) => r.lesson_id === active.id) : [];

  return (
    <LearnShell>
      {error ? <p className="text-danger">{error}</p> : null}
      <div className="row gy-4">
        <div className="col-lg-8">
          <div className="card radius-12">
            <div className="card-body">
              <h5>{course?.title}</h5>
              <h6 className="text-secondary-light">{active?.title}</h6>
              {active?.type === "video" ? (
                <video ref={videoRef} controls className="w-100 radius-8 bg-dark" onEnded={completeLesson} />
              ) : null}
              {active?.type === "article" ? (
                <div>
                  <div dangerouslySetInnerHTML={{ __html: active.article_content || "" }} />
                  <button className="btn btn-primary-600 mt-3" onClick={completeLesson}>
                    Mark complete
                  </button>
                </div>
              ) : null}
              {active?.type === "quiz" && active.quiz_id ? <QuizBlock quizId={active.quiz_id} /> : null}

              {activeResources.length ? (
                <div className="mt-4 pt-3 border-top">
                  <h6>Downloads</h6>
                  <ul className="list-unstyled mb-0">
                    {activeResources.map((file) => (
                      <li key={file.id} className="mb-2">
                        <button
                          type="button"
                          className="btn btn-outline-primary-600 btn-sm"
                          disabled={downloading === file.id}
                          onClick={() => downloadResource(file.id)}
                        >
                          {downloading === file.id ? "Preparing…" : `Download PDF — ${file.title}`}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </div>
        </div>
        <div className="col-lg-4">
          <div className="card radius-12">
            <div className="card-body">
              <h6>Curriculum</h6>
              {modules.map((mod) => (
                <div key={mod.id} className="mb-3">
                  <strong>{mod.title}</strong>
                  <ul className="list-unstyled mt-2">
                    {lessons
                      .filter((l) => l.module_id === mod.id)
                      .map((lesson) => (
                        <li key={lesson.id}>
                          <button className="btn btn-link p-0" onClick={() => setActive(lesson)}>
                            {lesson.title}
                            {resources.some((r) => r.lesson_id === lesson.id) ? " · PDF" : ""}
                          </button>
                        </li>
                      ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </LearnShell>
  );
}

function QuizBlock({ quizId }: { quizId: string }) {
  const [data, setData] = useState<QuizPayload | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<{ score: number; passed: boolean } | null>(null);

  useEffect(() => {
    apiClient<QuizPayload>(`/quizzes/${quizId}`).then(setData).catch(() => undefined);
  }, [quizId]);

  async function submit() {
    const res = await apiClient<{ score: number; passed: boolean }>(`/quizzes/${quizId}/attempt`, {
      method: "POST",
      body: JSON.stringify({ answers }),
    });
    setResult(res);
  }

  if (!data) return <p>Loading quiz…</p>;
  return (
    <div>
      <h6>{data.quiz.title}</h6>
      {data.questions.map((q) => (
        <div key={q.id} className="mb-3">
          <p>{q.prompt}</p>
          {data.options
            .filter((o) => o.question_id === q.id)
            .map((o) => (
              <label key={o.id} className="d-block">
                <input
                  type="radio"
                  name={q.id}
                  checked={answers[q.id] === o.id}
                  onChange={() => setAnswers((a) => ({ ...a, [q.id]: o.id }))}
                />{" "}
                {o.label}
              </label>
            ))}
        </div>
      ))}
      <button className="btn btn-primary-600" onClick={submit}>
        Submit
      </button>
      {result ? (
        <p className="mt-3">
          Score {result.score}%. {result.passed ? "Passed." : "Try again."}
        </p>
      ) : null}
    </div>
  );
}
