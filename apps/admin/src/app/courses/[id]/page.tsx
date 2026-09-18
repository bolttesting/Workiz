"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AdminShell } from "@/components/AdminShell";
import { apiClient } from "@/lib/api";
import type { Course, Lesson, ModuleRow, MediaAsset } from "@workix/db/types";

export default function CourseBuilderPage() {
  const { id } = useParams<{ id: string }>();
  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<ModuleRow[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [media, setMedia] = useState<MediaAsset[]>([]);
  const [moduleTitle, setModuleTitle] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    const res = await apiClient<{
      course: Course;
      modules: ModuleRow[];
      lessons: Lesson[];
      media: MediaAsset[];
    }>(`/admin/courses/${id}/tree`);
    setCourse(res.course);
    setModules(res.modules);
    setLessons(res.lessons);
    setMedia(res.media);
  }

  useEffect(() => {
    refresh().catch((err) => setError((err as Error).message));
  }, [id]);

  async function saveCourse(patch: Partial<Course>) {
    await apiClient(`/admin/courses/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
    await refresh();
  }

  async function addModule(e: React.FormEvent) {
    e.preventDefault();
    await apiClient(`/admin/courses/${id}/modules`, {
      method: "POST",
      body: JSON.stringify({ title: moduleTitle, sort_order: modules.length }),
    });
    setModuleTitle("");
    await refresh();
  }

  async function addLesson(moduleId: string, type: Lesson["type"]) {
    const title = prompt("Lesson title");
    if (!title) return;
    await apiClient(`/admin/modules/${moduleId}/lessons`, {
      method: "POST",
      body: JSON.stringify({ title, type, sort_order: lessons.filter((l) => l.module_id === moduleId).length }),
    });
    await refresh();
  }

  async function uploadVideo(lessonId: string, file: File) {
    const { url } = await apiClient<{ url: string; key: string }>(`/admin/lessons/${lessonId}/upload-url`, {
      method: "POST",
      body: JSON.stringify({ contentType: file.type || "video/mp4", fileName: file.name }),
    });
    await fetch(url, { method: "PUT", body: file, headers: { "Content-Type": file.type || "video/mp4" } });
    await apiClient(`/admin/lessons/${lessonId}/transcode`, { method: "POST" });
    await refresh();
  }

  async function addQuiz(lessonId: string) {
    await apiClient(`/quizzes/lessons/${lessonId}`, {
      method: "POST",
      body: JSON.stringify({
        title: "Lesson quiz",
        passing_score: 70,
        questions: [
          {
            prompt: "Did you complete this lesson?",
            options: [
              { label: "Yes", is_correct: true },
              { label: "Not yet", is_correct: false },
            ],
          },
        ],
      }),
    });
    await refresh();
  }

  if (!course) {
    return (
      <AdminShell>
        <p>{error || "Loading…"}</p>
      </AdminShell>
    );
  }

  return (
    <AdminShell>
      <h6>{course.title}</h6>
      <div className="card radius-12 mb-24">
        <div className="card-body row gy-3">
          <div className="col-md-6">
            <label>Subtitle</label>
            <input
              className="form-control"
              defaultValue={course.subtitle ?? ""}
              onBlur={(e) => saveCourse({ subtitle: e.target.value })}
            />
          </div>
          <div className="col-md-3">
            <label>Price (cents)</label>
            <input
              className="form-control"
              type="number"
              defaultValue={course.price_cents}
              onBlur={(e) => saveCourse({ price_cents: Number(e.target.value) })}
            />
          </div>
          <div className="col-md-3 d-flex align-items-end">
            <label className="d-flex align-items-center gap-2">
              <input type="checkbox" checked={course.published} onChange={(e) => saveCourse({ published: e.target.checked })} />
              Published
            </label>
          </div>
          <div className="col-12">
            <textarea
              className="form-control"
              rows={4}
              defaultValue={course.description ?? ""}
              onBlur={(e) => saveCourse({ description: e.target.value })}
            />
          </div>
        </div>
      </div>

      <form className="d-flex gap-2 mb-16" onSubmit={addModule}>
        <input className="form-control" placeholder="New module" value={moduleTitle} onChange={(e) => setModuleTitle(e.target.value)} />
        <button className="btn btn-primary-600" type="submit">
          Add module
        </button>
      </form>

      {modules.map((mod) => (
        <div className="card radius-12 mb-16" key={mod.id}>
          <div className="card-body">
            <div className="d-flex justify-content-between">
              <h6>{mod.title}</h6>
              <div className="d-flex gap-2">
                <button className="btn btn-sm btn-outline-primary-600" onClick={() => addLesson(mod.id, "video")}>
                  + Video
                </button>
                <button className="btn btn-sm btn-outline-primary-600" onClick={() => addLesson(mod.id, "article")}>
                  + Article
                </button>
                <button className="btn btn-sm btn-outline-primary-600" onClick={() => addLesson(mod.id, "quiz")}>
                  + Quiz
                </button>
              </div>
            </div>
            <ul className="mt-3">
              {lessons
                .filter((l) => l.module_id === mod.id)
                .map((lesson) => {
                  const asset = media.find((m) => m.lesson_id === lesson.id);
                  return (
                    <li key={lesson.id} className="mb-3">
                      <strong>{lesson.title}</strong> ({lesson.type}) {asset ? `— ${asset.status}` : ""}
                      {lesson.type === "video" ? (
                        <input
                          className="form-control mt-2"
                          type="file"
                          accept="video/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) uploadVideo(lesson.id, file);
                          }}
                        />
                      ) : null}
                      {lesson.type === "quiz" && !lesson.quiz_id ? (
                        <button className="btn btn-sm btn-primary-600 mt-2" onClick={() => addQuiz(lesson.id)}>
                          Create default quiz
                        </button>
                      ) : null}
                    </li>
                  );
                })}
            </ul>
          </div>
        </div>
      ))}
    </AdminShell>
  );
}
