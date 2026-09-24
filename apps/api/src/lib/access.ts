import { adminDb } from "./db.js";
import type { Profile } from "@workix/db/types";

export async function hasCourseAccess(profile: Profile, courseId: string) {
  if (profile.role === "super_admin") return true;
  if (profile.role === "instructor") {
    const { data: assigned } = await adminDb
      .from("course_instructors")
      .select("course_id")
      .eq("course_id", courseId)
      .eq("user_id", profile.id)
      .maybeSingle();
    if (assigned) return true;
  }

  const { data: enrollment } = await adminDb
    .from("enrollments")
    .select("id")
    .eq("user_id", profile.id)
    .eq("course_id", courseId)
    .maybeSingle();
  if (enrollment) return true;

  if (
    (profile.role === "company_admin" || profile.role === "company_learner") &&
    profile.organization_id
  ) {
    const { data: org } = await adminDb
      .from("organizations")
      .select("status, seat_limit")
      .eq("id", profile.organization_id)
      .single();
    if (org && org.status === "active" && org.seat_limit > 0) {
      await adminDb.from("enrollments").upsert(
        { user_id: profile.id, course_id: courseId, source: "seat" },
        { onConflict: "user_id,course_id" },
      );
      return true;
    }
  }

  return false;
}

/** Super admin, or instructor assigned to this course. */
export async function canModerateCourse(profile: Profile, courseId: string) {
  if (profile.role === "super_admin") return true;
  if (profile.role !== "instructor") return false;
  const { data } = await adminDb
    .from("course_instructors")
    .select("course_id")
    .eq("course_id", courseId)
    .eq("user_id", profile.id)
    .maybeSingle();
  return Boolean(data);
}

export function nextInvoiceNumber() {
  const stamp = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  const rand = Math.floor(Math.random() * 9000 + 1000);
  return `WX-${stamp}-${rand}`;
}
