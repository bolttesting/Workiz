import { ensureCertificateNumber } from "./certificate-code.js";
import { adminDb } from "./db.js";
import { pdfQueue } from "./queue.js";

export async function maybeIssueCertificate(userId: string, courseId: string) {
  const { data: profile } = await adminDb.from("profiles").select("role").eq("id", userId).maybeSingle();
  if (profile?.role === "company_admin") return;
  const { data: modules } = await adminDb.from("modules").select("id").eq("course_id", courseId);
  const ids = (modules ?? []).map((module) => module.id);
  if (!ids.length) return;
  const { data: lessons } = await adminDb.from("lessons").select("id, quiz_id").in("module_id", ids);
  const lessonIds = (lessons ?? []).map((lesson) => lesson.id);
  if (!lessonIds.length) return;
  const { data: progress } = await adminDb
    .from("lesson_progress")
    .select("lesson_id, completed")
    .eq("user_id", userId)
    .in("lesson_id", lessonIds);
  const done = new Set((progress ?? []).filter((row) => row.completed).map((row) => row.lesson_id));
  if (lessonIds.some((id) => !done.has(id))) return;

  const quizIds = (lessons ?? []).map((lesson) => lesson.quiz_id).filter((id): id is string => Boolean(id));
  if (quizIds.length) {
    const { data: attempts } = await adminDb
      .from("quiz_attempts")
      .select("quiz_id")
      .eq("user_id", userId)
      .eq("passed", true)
      .in("quiz_id", quizIds);
    const passed = new Set((attempts ?? []).map((row) => row.quiz_id));
    if (quizIds.some((id) => !passed.has(id))) return;
  }

  const { data: course } = await adminDb.from("courses").select("certificate_months").eq("id", courseId).maybeSingle();
  const months = Number(course?.certificate_months) || 0;
  const expiresAt = months > 0 ? new Date(Date.now() + months * 30 * 86_400_000).toISOString() : null;
  const { data: existing } = await adminDb
    .from("certificates")
    .select("id, expires_at")
    .eq("user_id", userId)
    .eq("course_id", courseId)
    .maybeSingle();
  if (existing) {
    const expires = existing.expires_at ? new Date(existing.expires_at).getTime() : null;
    const renewing = expires != null && expires - Date.now() < 14 * 86_400_000;
    if (!renewing) return;
    const patch: { issued_at: string; expires_at?: string | null; pdf_key: null } = {
      issued_at: new Date().toISOString(),
      pdf_key: null,
    };
    if (expiresAt) patch.expires_at = expiresAt;
    await adminDb.from("certificates").update(patch).eq("id", existing.id);
    try {
      await pdfQueue().add("certificate", { kind: "certificate", userId, courseId });
    } catch {
      /* redis optional locally */
    }
    return;
  }
  const insert: { user_id: string; course_id: string; expires_at?: string } = { user_id: userId, course_id: courseId };
  if (expiresAt) insert.expires_at = expiresAt;
  let { data: cert, error } = await adminDb.from("certificates").insert(insert).select("id").single();
  if (error && /expires_at/i.test(error.message)) {
    const retry = await adminDb.from("certificates").insert({ user_id: userId, course_id: courseId }).select("id").single();
    cert = retry.data;
  }
  if (!cert) return;
  await ensureCertificateNumber(cert.id);
  try {
    await pdfQueue().add("certificate", { kind: "certificate", userId, courseId });
  } catch {
    /* redis optional locally; the certificate row is already saved */
  }
}
