"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AdminShell } from "@/components/AdminShell";
import { AdminPageHeader, StatusBadge } from "@/components/AdminUi";
import { RichTextEditor } from "@/components/RichTextEditor";
import { apiClient } from "@/lib/api";
import { uploadAdminAsset, centsFromMajor, majorFromCents, COURSE_CURRENCIES } from "@/lib/uploads";
import { COURSE_DEPARTMENTS, DIRHAM_SIGN } from "@workix/config";
import { QuizEditor } from "@/components/QuizEditor";
import type { Course, Lesson, LessonResource, ModuleRow, MediaAsset } from "@workix/db/types";

type TabId = "basics" | "media" | "curriculum" | "publish";

const TABS: { id: TabId; label: string; hint: string }[] = [
  { id: "basics", label: "1. Basics", hint: "Title and catalog text" },
  { id: "media", label: "2. Cover media", hint: "Image or video" },
  { id: "curriculum", label: "3. Curriculum", hint: "Chapters & lectures" },
  { id: "publish", label: "4. Publish", hint: "Price & go live" },
];

function ArticleLessonEditor({
  initialHtml,
  onSave,
}: {
  initialHtml: string;
  onSave: (html: string) => Promise<void>;
}) {
  const [html, setHtml] = useState(initialHtml);
  const [saving, setSaving] = useState(false);
  return (
    <div className="mt-12">
      <label className="form-label">Article / reading content</label>
      <RichTextEditor value={html} onChange={setHtml} placeholder="Write the lecture content…" />
      <button
        type="button"
        className="btn btn-primary-600 radius-8 mt-12"
        disabled={saving}
        onClick={async () => {
          setSaving(true);
          try {
            await onSave(html);
          } finally {
            setSaving(false);
          }
        }}
      >
        {saving ? "Saving…" : "Save lecture content"}
      </button>
    </div>
  );
}

function FileUploadField({
  label,
  accept,
  busy,
  onFile,
  hint,
}: {
  label: string;
  accept: string;
  busy?: boolean;
  onFile: (file: File) => void;
  hint?: string;
}) {
  return (
    <div>
      <label className="form-label">{label}</label>
      <input
        className="form-control radius-8"
        type="file"
        accept={accept}
        disabled={busy}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
          e.target.value = "";
        }}
      />
      {hint ? <p className="text-sm text-secondary-light mt-8 mb-0">{hint}</p> : null}
      {busy ? <p className="text-sm text-primary-600 mt-8 mb-0">Uploading…</p> : null}
    </div>
  );
}

export default function CourseBuilderPage() {
  const { id } = useParams<{ id: string }>();
  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<ModuleRow[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [media, setMedia] = useState<MediaAsset[]>([]);
  const [resources, setResources] = useState<LessonResource[]>([]);
  const [tab, setTab] = useState<TabId>("basics");
  const [chapterTitle, setChapterTitle] = useState("");
  const [lessonDrafts, setLessonDrafts] = useState<Record<string, { title: string; type: Lesson["type"] }>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [priceMajor, setPriceMajor] = useState(0);
  const [currency, setCurrency] = useState("usd");
  const [published, setPublished] = useState(false);
  const [expandedLesson, setExpandedLesson] = useState<string | null>(null);
  const [basics, setBasics] = useState({
    title: "",
    slug: "",
    subtitle: "",
    description: "",
    level: "",
    duration_minutes: 0,
    learning_outcomes: "",
    audience: "",
    tags: "",
  });

  function linesToList(value: string) {
    return value
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
  }

  function listToLines(value: string[] | null | undefined) {
    return (value ?? []).join("\n");
  }

  async function refresh() {
    const res = await apiClient<{
      course: Course;
      modules: ModuleRow[];
      lessons: Lesson[];
      media: MediaAsset[];
      resources: LessonResource[];
    }>(`/admin/courses/${id}/tree`);
    setCourse(res.course);
    setModules(res.modules);
    setLessons(res.lessons);
    setMedia(res.media);
    setResources(res.resources ?? []);
    setPriceMajor(majorFromCents(res.course.price_cents));
    setCurrency(res.course.currency || "usd");
    setPublished(Boolean(res.course.published));
    setBasics({
      title: res.course.title,
      slug: res.course.slug,
      subtitle: res.course.subtitle ?? "",
      description: res.course.description ?? "",
      level: res.course.level ?? "",
      duration_minutes: res.course.duration_minutes ?? 0,
      learning_outcomes: listToLines(res.course.learning_outcomes),
      audience: listToLines(res.course.audience),
      tags: listToLines(res.course.tags),
    });
    setLessonDrafts((prev) => {
      const next = { ...prev };
      for (const mod of res.modules) {
        if (!next[mod.id]) next[mod.id] = { title: "", type: "video" };
      }
      return next;
    });
  }

  useEffect(() => {
    refresh().catch((err) => setError((err as Error).message));
  }, [id]);

  async function saveCourse(patch: Partial<Course>) {
    setSaving(true);
    setError(null);
    try {
      await apiClient(`/admin/courses/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
      await refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function saveBasics(e: React.FormEvent) {
    e.preventDefault();
    await saveCourse({
      title: basics.title,
      slug: basics.slug,
      subtitle: basics.subtitle || null,
      description: basics.description || null,
      level: basics.level || null,
      duration_minutes: basics.duration_minutes,
      learning_outcomes: linesToList(basics.learning_outcomes),
      audience: linesToList(basics.audience),
      tags: linesToList(basics.tags),
    });
  }

  async function savePublish(e: React.FormEvent) {
    e.preventDefault();
    await saveCourse({
      price_cents: centsFromMajor(priceMajor),
      currency,
      published,
    });
  }

  async function addChapter(e: React.FormEvent) {
    e.preventDefault();
    if (!chapterTitle.trim()) return;
    setError(null);
    try {
      await apiClient(`/admin/courses/${id}/modules`, {
        method: "POST",
        body: JSON.stringify({ title: chapterTitle.trim(), sort_order: modules.length }),
      });
      setChapterTitle("");
      await refresh();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function removeChapter(moduleId: string) {
    if (!window.confirm("Delete this chapter and all its lectures?")) return;
    await apiClient(`/admin/modules/${moduleId}`, { method: "DELETE" });
    await refresh();
  }

  async function addLecture(moduleId: string) {
    const draft = lessonDrafts[moduleId] ?? { title: "", type: "video" as const };
    if (!draft.title.trim()) {
      setError("Enter a lecture title before adding.");
      return;
    }
    setError(null);
    try {
      const res = await apiClient<{ lesson: Lesson }>(`/admin/modules/${moduleId}/lessons`, {
        method: "POST",
        body: JSON.stringify({
          title: draft.title.trim(),
          type: draft.type,
          sort_order: lessons.filter((l) => l.module_id === moduleId).length,
        }),
      });
      const lessonId = res.lesson.id;
      if (draft.type === "quiz") {
        await apiClient(`/quizzes/admin/lessons/${lessonId}`, {
          method: "PUT",
          body: JSON.stringify({
            title: draft.title.trim() || "Lecture quiz",
            passing_score: 70,
            questions: [
              {
                prompt: "Sample question — edit this",
                options: [
                  { label: "Correct answer", is_correct: true },
                  { label: "Wrong answer", is_correct: false },
                ],
              },
            ],
          }),
        });
      }
      setLessonDrafts((prev) => ({ ...prev, [moduleId]: { title: "", type: "video" } }));
      setExpandedLesson(lessonId);
      await refresh();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function saveLesson(lessonId: string, patch: Partial<Lesson>) {
    await apiClient(`/admin/lessons/${lessonId}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
    await refresh();
  }

  async function removeLesson(lessonId: string) {
    if (!window.confirm("Delete this lecture?")) return;
    await apiClient(`/admin/lessons/${lessonId}`, { method: "DELETE" });
    await refresh();
  }

  async function uploadVideo(lessonId: string, file: File) {
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      await apiClient(`/admin/lessons/${lessonId}/video`, {
        method: "POST",
        body: form,
      });
      await refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploading(false);
    }
  }

  async function uploadLessonPdf(lessonId: string, file: File) {
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("folder", "lessons");
      const { key, publicUrl } = await apiClient<{ key: string; publicUrl: string }>("/admin/assets/upload", {
        method: "POST",
        body: form,
      });
      const title = file.name.replace(/\.pdf$/i, "").trim() || "Handout";
      await apiClient(`/admin/lessons/${lessonId}/resources`, {
        method: "POST",
        body: JSON.stringify({
          title,
          file_key: key,
          file_url: publicUrl,
          content_type: file.type || "application/pdf",
          byte_size: file.size,
        }),
      });
      await refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploading(false);
    }
  }

  async function removeResource(resourceId: string) {
    if (!window.confirm("Remove this downloadable file?")) return;
    await apiClient(`/admin/resources/${resourceId}`, { method: "DELETE" });
    await refresh();
  }

  function formatBytes(n: number | null) {
    if (!n || n <= 0) return "";
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  }

  async function uploadThumb(file: File) {
    setUploading(true);
    setError(null);
    try {
      const publicUrl = await uploadAdminAsset(file, "courses");
      await saveCourse({ thumbnail_url: publicUrl });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploading(false);
    }
  }

  async function uploadCoverVideo(file: File) {
    setUploading(true);
    setError(null);
    try {
      const publicUrl = await uploadAdminAsset(file, "courses");
      await saveCourse({ cover_video_url: publicUrl });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploading(false);
    }
  }

  async function addQuiz(lessonId: string) {
    await apiClient(`/quizzes/admin/lessons/${lessonId}`, {
      method: "PUT",
      body: JSON.stringify({
        title: "Lecture quiz",
        passing_score: 70,
        questions: [
          {
            prompt: "Did you complete this lecture?",
            options: [
              { label: "Yes", is_correct: true },
              { label: "Not yet", is_correct: false },
            ],
          },
        ],
      }),
    });
    await refresh();
    setExpandedLesson(lessonId);
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
      <AdminPageHeader
        title={course.title}
        description="Build the course in steps: basics → cover media → chapters/lectures → publish."
        action={
          <Link href="/courses" className="btn btn-outline-primary-600 radius-8">
            Back to courses
          </Link>
        }
      />

      {error ? (
        <div className="alert alert-danger radius-8 mb-24" role="alert">
          {error}
        </div>
      ) : null}

      <div className="card radius-12 shadow-1 mb-24">
        <div className="card-body p-16">
          <div className="d-flex flex-wrap gap-2">
            {TABS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`btn radius-8 ${tab === item.id ? "btn-primary-600" : "btn-outline-primary-600"}`}
                onClick={() => setTab(item.id)}
              >
                <span className="d-block">{item.label}</span>
                <span className="text-xs opacity-75">{item.hint}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {tab === "basics" ? (
        <form className="card radius-12 shadow-1" onSubmit={saveBasics}>
          <div className="card-header border-bottom bg-base py-16 px-24">
            <h6 className="mb-0 fw-semibold">Catalog text</h6>
            <p className="text-sm text-secondary-light mb-0 mt-4">
              Only the fields shoppers see on the course card and detail page.
            </p>
          </div>
          <div className="card-body row gy-3">
            <div className="col-md-6">
              <label className="form-label">Course title *</label>
              <input
                className="form-control radius-8"
                value={basics.title}
                onChange={(e) => setBasics((s) => ({ ...s, title: e.target.value }))}
                required
              />
            </div>
            <div className="col-md-6">
              <label className="form-label">URL slug *</label>
              <input
                className="form-control radius-8"
                value={basics.slug}
                onChange={(e) => setBasics((s) => ({ ...s, slug: e.target.value }))}
                required
              />
            </div>
            <div className="col-12">
              <label className="form-label">Short subtitle</label>
              <input
                className="form-control radius-8"
                value={basics.subtitle}
                onChange={(e) => setBasics((s) => ({ ...s, subtitle: e.target.value }))}
                placeholder="One line under the title"
              />
            </div>
            <div className="col-12">
              <label className="form-label">Full description</label>
              <textarea
                className="form-control radius-8"
                rows={6}
                value={basics.description}
                onChange={(e) => setBasics((s) => ({ ...s, description: e.target.value }))}
                placeholder="What learners will learn and why it matters…"
              />
            </div>
            <div className="col-md-6">
              <label className="form-label">Department (shown as badge)</label>
              <select
                className="form-select radius-8"
                value={basics.level}
                onChange={(e) => setBasics((s) => ({ ...s, level: e.target.value }))}
              >
                <option value="">Select…</option>
                {COURSE_DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-6">
              <label className="form-label">Total duration (minutes)</label>
              <input
                className="form-control radius-8"
                type="number"
                min={0}
                value={basics.duration_minutes}
                onChange={(e) => setBasics((s) => ({ ...s, duration_minutes: Number(e.target.value) }))}
              />
            </div>
            <div className="col-md-6">
              <label className="form-label">What you&apos;ll learn</label>
              <textarea
                className="form-control radius-8"
                rows={5}
                value={basics.learning_outcomes}
                onChange={(e) => setBasics((s) => ({ ...s, learning_outcomes: e.target.value }))}
                placeholder={"One outcome per line\nSet clear weekly priorities\nRun meetings that end with owners"}
              />
              <p className="text-sm text-secondary-light mt-8 mb-0">Shown as checklist bullets on the course page.</p>
            </div>
            <div className="col-md-6">
              <label className="form-label">Who it&apos;s for</label>
              <textarea
                className="form-control radius-8"
                rows={5}
                value={basics.audience}
                onChange={(e) => setBasics((s) => ({ ...s, audience: e.target.value }))}
                placeholder={"One audience tag per line\nNew managers\nTeam leads"}
              />
              <p className="text-sm text-secondary-light mt-8 mb-0">Shown as pills under “Who it&apos;s for”.</p>
            </div>
            <div className="col-12">
              <label className="form-label">Course tags</label>
              <textarea
                className="form-control radius-8"
                rows={3}
                value={basics.tags}
                onChange={(e) => setBasics((s) => ({ ...s, tags: e.target.value }))}
                placeholder={"One tag per line\nRemote work\nUAE\nOnboarding"}
              />
              <p className="text-sm text-secondary-light mt-8 mb-0">
                Extra labels for search and the course page. Department is separate (badge above).
              </p>
            </div>
            <div className="col-12 d-flex justify-content-between align-items-center">
              <span className="text-sm text-secondary-light">{saving ? "Saving…" : ""}</span>
              <div className="d-flex gap-2">
                <button type="submit" className="btn btn-primary-600 radius-8" disabled={saving}>
                  Save basics
                </button>
                <button type="button" className="btn btn-outline-primary-600 radius-8" onClick={() => setTab("media")}>
                  Next: cover media
                </button>
              </div>
            </div>
          </div>
        </form>
      ) : null}

      {tab === "media" ? (
        <div className="card radius-12 shadow-1">
          <div className="card-header border-bottom bg-base py-16 px-24">
            <h6 className="mb-0 fw-semibold">Cover media</h6>
            <p className="text-sm text-secondary-light mb-0 mt-4">
              Image is used on course cards. Video (optional) plays as the hero on the course detail page.
            </p>
          </div>
          <div className="card-body row gy-4 align-items-start">
            <div className="col-md-6">
              <FileUploadField
                label="Cover image (JPG/PNG/WebP)"
                accept="image/*"
                busy={uploading}
                onFile={uploadThumb}
                hint="Recommended ~1200×800. Shown on catalog cards and as video poster."
              />
              <div className="mt-16">
                {course.thumbnail_url ? (
                  <img
                    src={course.thumbnail_url}
                    alt=""
                    className="w-100 radius-12 border"
                    style={{ maxHeight: 220, objectFit: "cover" }}
                  />
                ) : (
                  <div
                    className="border radius-12 bg-neutral-50 d-flex align-items-center justify-content-center"
                    style={{ minHeight: 160 }}
                  >
                    <span className="text-secondary-light">No image yet</span>
                  </div>
                )}
              </div>
              {course.thumbnail_url ? (
                <button
                  type="button"
                  className="btn btn-sm btn-outline-danger-600 radius-8 mt-12"
                  disabled={uploading || saving}
                  onClick={() => saveCourse({ thumbnail_url: null })}
                >
                  Remove image
                </button>
              ) : null}
            </div>
            <div className="col-md-6">
              <FileUploadField
                label="Cover video (MP4/WebM)"
                accept="video/mp4,video/webm,video/*"
                busy={uploading}
                onFile={uploadCoverVideo}
                hint="Short trailer or intro. Plays muted with controls on the course page."
              />
              <div className="mt-16">
                {course.cover_video_url ? (
                  <video
                    key={course.cover_video_url}
                    src={course.cover_video_url}
                    className="w-100 radius-12 border"
                    style={{ maxHeight: 220, background: "#102846" }}
                    controls
                    playsInline
                    preload="metadata"
                  />
                ) : (
                  <div
                    className="border radius-12 bg-neutral-50 d-flex align-items-center justify-content-center"
                    style={{ minHeight: 160 }}
                  >
                    <span className="text-secondary-light">No video yet (optional)</span>
                  </div>
                )}
              </div>
              {course.cover_video_url ? (
                <button
                  type="button"
                  className="btn btn-sm btn-outline-danger-600 radius-8 mt-12"
                  disabled={uploading || saving}
                  onClick={() => saveCourse({ cover_video_url: null })}
                >
                  Remove video
                </button>
              ) : null}
            </div>
            <div className="col-12 d-flex justify-content-end gap-2">
              <button type="button" className="btn btn-outline-primary-600 radius-8" onClick={() => setTab("basics")}>
                Back
              </button>
              <button type="button" className="btn btn-primary-600 radius-8" onClick={() => setTab("curriculum")}>
                Next: curriculum
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {tab === "curriculum" ? (
        <div className="card radius-12 shadow-1">
          <div className="card-header border-bottom bg-base py-16 px-24">
            <h6 className="mb-0 fw-semibold">Curriculum = Chapters → Lectures</h6>
            <p className="text-sm text-secondary-light mb-0 mt-4">
              Add a <strong>chapter</strong>, then lectures: video, article, or <strong>Quiz</strong>. Choosing Quiz
              opens the question editor automatically.
            </p>
          </div>
          <div className="card-body">
            <form className="d-flex flex-wrap gap-2 mb-24 p-16 border radius-12 bg-neutral-50" onSubmit={addChapter}>
              <input
                className="form-control radius-8"
                style={{ minWidth: 220, flex: 1 }}
                placeholder="Chapter title, e.g. Chapter 1 — Getting started"
                value={chapterTitle}
                onChange={(e) => setChapterTitle(e.target.value)}
              />
              <button className="btn btn-primary-600 radius-8" type="submit">
                Add chapter
              </button>
            </form>

            {modules.length === 0 ? (
              <p className="text-secondary-light text-center py-24 mb-0">
                No chapters yet. Create your first chapter above, then add lectures under it.
              </p>
            ) : null}

            {modules.map((mod, index) => {
              const chapterLessons = lessons.filter((l) => l.module_id === mod.id);
              const draft = lessonDrafts[mod.id] ?? { title: "", type: "video" as const };
              return (
                <div className="border radius-12 p-20 mb-16" key={mod.id}>
                  <div className="d-flex flex-wrap justify-content-between gap-3 mb-16">
                    <div>
                      <StatusBadge label={`Chapter ${index + 1}`} tone="primary" />
                      <h6 className="mb-0 mt-8">{mod.title}</h6>
                      <p className="text-sm text-secondary-light mb-0">
                        {chapterLessons.length} lecture{chapterLessons.length === 1 ? "" : "s"}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-danger-600 radius-8"
                      onClick={() => removeChapter(mod.id)}
                    >
                      Delete chapter
                    </button>
                  </div>

                  <div className="d-flex flex-wrap gap-2 mb-16 p-12 border radius-8">
                    <input
                      className="form-control radius-8"
                      style={{ minWidth: 180, flex: 1 }}
                      placeholder="Lecture title"
                      value={draft.title}
                      onChange={(e) =>
                        setLessonDrafts((prev) => ({
                          ...prev,
                          [mod.id]: { ...draft, title: e.target.value },
                        }))
                      }
                    />
                    <select
                      className="form-select radius-8"
                      style={{ maxWidth: 140 }}
                      value={draft.type}
                      onChange={(e) =>
                        setLessonDrafts((prev) => ({
                          ...prev,
                          [mod.id]: { ...draft, type: e.target.value as Lesson["type"] },
                        }))
                      }
                    >
                      <option value="video">Video lecture</option>
                      <option value="article">Article / reading</option>
                      <option value="quiz">Quiz</option>
                    </select>
                    <button type="button" className="btn btn-outline-primary-600 radius-8" onClick={() => addLecture(mod.id)}>
                      Add lecture
                    </button>
                  </div>

                  {chapterLessons.map((lesson, lessonIndex) => {
                    const asset = media.find((m) => m.lesson_id === lesson.id);
                    const lessonFiles = resources.filter((r) => r.lesson_id === lesson.id);
                    const open = expandedLesson === lesson.id;
                    return (
                      <div className="border radius-8 p-16 mb-12 bg-base" key={lesson.id}>
                        <div className="d-flex flex-wrap justify-content-between gap-2">
                          <div>
                            <strong>
                              Lecture {lessonIndex + 1}: {lesson.title}
                            </strong>{" "}
                            <StatusBadge label={lesson.type} tone="info" />{" "}
                            {lesson.is_preview ? <StatusBadge label="Free preview" tone="success" /> : null}{" "}
                            {asset ? <StatusBadge label={`video: ${asset.status}`} tone="neutral" /> : null}
                            {lessonFiles.length ? (
                              <StatusBadge label={`${lessonFiles.length} PDF${lessonFiles.length > 1 ? "s" : ""}`} tone="neutral" />
                            ) : null}
                          </div>
                          <div className="d-flex gap-2">
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-primary-600 radius-8"
                              onClick={() => setExpandedLesson(open ? null : lesson.id)}
                            >
                              {open ? "Collapse" : "Open lecture"}
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-danger-600 radius-8"
                              onClick={() => removeLesson(lesson.id)}
                            >
                              Delete
                            </button>
                          </div>
                        </div>

                        {open ? (
                          <div className="mt-16">
                            <div className="row gy-3">
                              <div className="col-md-8">
                                <label className="form-label">Lecture title</label>
                                <input
                                  className="form-control radius-8"
                                  defaultValue={lesson.title}
                                  onBlur={(e) => saveLesson(lesson.id, { title: e.target.value })}
                                />
                              </div>
                              <div className="col-md-4">
                                <label className="form-label">Duration (seconds)</label>
                                <input
                                  className="form-control radius-8"
                                  type="number"
                                  defaultValue={lesson.duration_seconds ?? 0}
                                  onBlur={(e) => saveLesson(lesson.id, { duration_seconds: Number(e.target.value) })}
                                />
                              </div>
                              <div className="col-12">
                                <label className="d-flex align-items-center gap-2 mb-0">
                                  <input
                                    type="checkbox"
                                    checked={lesson.is_preview}
                                    onChange={(e) => saveLesson(lesson.id, { is_preview: e.target.checked })}
                                  />
                                  Free preview (visible before purchase)
                                </label>
                              </div>
                            </div>

                            {lesson.type === "video" ? (
                              <div className="mt-16">
                                <FileUploadField
                                  label="Upload lecture video file"
                                  accept="video/*"
                                  busy={uploading}
                                  onFile={(file) => uploadVideo(lesson.id, file)}
                                  hint="Upload MP4/WebM. Stored on Hostinger and plays directly (HLS/S3 later)."
                                />
                              </div>
                            ) : null}

                            {lesson.type === "article" ? (
                              <ArticleLessonEditor
                                key={lesson.id}
                                initialHtml={lesson.article_content ?? ""}
                                onSave={(html) => saveLesson(lesson.id, { article_content: html })}
                              />
                            ) : null}

                            {lesson.type === "quiz" ? (
                              lesson.quiz_id ? (
                                <QuizEditor lessonId={lesson.id} onSaved={() => refresh().catch(() => undefined)} />
                              ) : (
                                <div className="mt-16">
                                  <p className="text-sm text-secondary-light mb-12">
                                    No quiz yet. Create one, then edit questions below.
                                  </p>
                                  <button
                                    type="button"
                                    className="btn btn-primary-600 radius-8"
                                    onClick={() => addQuiz(lesson.id)}
                                  >
                                    Start quiz editor
                                  </button>
                                </div>
                              )
                            ) : null}

                            {lesson.type !== "quiz" ? (
                              <div className="mt-16 border-top pt-16">
                                <h6 className="mb-12">Downloadable PDFs</h6>
                                {lessonFiles.length ? (
                                  <ul className="list-unstyled mb-12">
                                    {lessonFiles.map((file) => (
                                      <li
                                        key={file.id}
                                        className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-8"
                                      >
                                        <span>
                                          {file.title}
                                          {file.byte_size ? (
                                            <span className="text-secondary-light text-sm"> · {formatBytes(file.byte_size)}</span>
                                          ) : null}
                                        </span>
                                        <button
                                          type="button"
                                          className="btn btn-sm btn-outline-danger-600 radius-8"
                                          onClick={() => removeResource(file.id)}
                                        >
                                          Remove
                                        </button>
                                      </li>
                                    ))}
                                  </ul>
                                ) : (
                                  <p className="text-sm text-secondary-light mb-12">No PDFs yet. Add handouts learners can download.</p>
                                )}
                                <FileUploadField
                                  label="Add PDF handout"
                                  accept="application/pdf,.pdf"
                                  busy={uploading}
                                  onFile={(file) => uploadLessonPdf(lesson.id, file)}
                                  hint="PDF only. Learners with access (or free preview) can download."
                                />
                              </div>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              );
            })}

            <div className="d-flex justify-content-end gap-2 mt-16">
              <button type="button" className="btn btn-outline-primary-600 radius-8" onClick={() => setTab("media")}>
                Back
              </button>
              <button type="button" className="btn btn-primary-600 radius-8" onClick={() => setTab("publish")}>
                Next: publish
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {tab === "publish" ? (
        <form className="card radius-12 shadow-1" onSubmit={savePublish}>
          <div className="card-header border-bottom bg-base py-16 px-24">
            <h6 className="mb-0 fw-semibold">Price & publish</h6>
          </div>
          <div className="card-body">
            <div className="row gy-3 align-items-end mb-24">
              <div className="col-md-4">
                <label className="form-label">Price</label>
                <div className="input-group">
                  <span className="input-group-text dirham-sign" aria-hidden="true">
                    {currency === "aed" ? DIRHAM_SIGN : "$"}
                  </span>
                  <input
                    className="form-control radius-8"
                    type="number"
                    min={0}
                    step="0.01"
                    value={priceMajor}
                    onChange={(e) => setPriceMajor(Number(e.target.value))}
                  />
                </div>
              </div>
              <div className="col-md-4">
                <label className="form-label">Currency</label>
                <select
                  className="form-select radius-8"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                >
                  {COURSE_CURRENCIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="button"
              className={`workiz-publish-toggle${published ? " is-on" : ""}`}
              role="switch"
              aria-checked={published}
              onClick={() => setPublished((v) => !v)}
            >
              <span className="workiz-publish-toggle__copy">
                <strong>{published ? "Live on website" : "Draft"}</strong>
                <small>{published ? "Visible in the marketing catalog" : "Hidden until you turn this on"}</small>
              </span>
              <span className="workiz-publish-toggle__switch" aria-hidden="true">
                <span />
              </span>
            </button>

            <div className="workiz-publish-status" aria-label="Course readiness">
              <div className={`workiz-publish-status__item${course.thumbnail_url || course.cover_video_url ? " is-ok" : ""}`}>
                <i className={course.thumbnail_url || course.cover_video_url ? "ri-checkbox-circle-fill" : "ri-checkbox-blank-circle-line"} />
                <span>Cover</span>
              </div>
              <div className={`workiz-publish-status__item${modules.length > 0 ? " is-ok" : ""}`}>
                <i className={modules.length > 0 ? "ri-checkbox-circle-fill" : "ri-checkbox-blank-circle-line"} />
                <span>
                  {modules.length} chapter{modules.length === 1 ? "" : "s"}
                </span>
              </div>
              <div className={`workiz-publish-status__item${lessons.length > 0 ? " is-ok" : ""}`}>
                <i className={lessons.length > 0 ? "ri-checkbox-circle-fill" : "ri-checkbox-blank-circle-line"} />
                <span>
                  {lessons.length} lecture{lessons.length === 1 ? "" : "s"}
                </span>
              </div>
              <div className={`workiz-publish-status__item${published ? " is-ok" : ""}`}>
                <i className={published ? "ri-checkbox-circle-fill" : "ri-checkbox-blank-circle-line"} />
                <span>{published ? "Publishing" : "Not live"}</span>
              </div>
            </div>

            <div className="d-flex justify-content-between align-items-center mt-24">
              <button type="button" className="btn btn-outline-primary-600 radius-8" onClick={() => setTab("curriculum")}>
                Back
              </button>
              <button type="submit" className="btn btn-primary-600 radius-8 px-24" disabled={saving}>
                {saving ? "Saving…" : published ? "Save & publish" : "Save as draft"}
              </button>
            </div>
          </div>
        </form>
      ) : null}
    </AdminShell>
  );
}
