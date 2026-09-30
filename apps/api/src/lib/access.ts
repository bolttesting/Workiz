import { adminDb } from "./db.js";
import { gatesForUser } from "./course-gate.js";
import type { Profile } from "@workix/db/types";

export async function hasCourseAccess(profile: Profile, courseId: string) {
  if (profile.role === "super_admin" || profile.role === "company_admin") return true;
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
    .select("id, source")
    .eq("user_id", profile.id)
    .eq("course_id", courseId)
    .maybeSingle();
  if (!enrollment) return false;
  if (enrollment.source === "purchase") return true;
  const gate = (await gatesForUser(profile, [courseId]))[courseId];
  return !gate;
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

/** A paid order should have an invoice row even when the PDF worker is offline. */
export async function ensureInvoiceForOrder(order: {
  id: string;
  status: string;
  amount_cents: number;
  currency: string;
}) {
  if (order.status !== "paid") return null;
  const { data: existing } = await adminDb.from("invoices").select("*").eq("order_id", order.id).maybeSingle();
  if (existing) return existing;
  const { data, error } = await adminDb
    .from("invoices")
    .insert({
      order_id: order.id,
      number: nextInvoiceNumber(),
      amount_cents: order.amount_cents,
      currency: order.currency,
    })
    .select("*")
    .single();
  if (error) {
    const { data: raced } = await adminDb.from("invoices").select("*").eq("order_id", order.id).maybeSingle();
    return raced;
  }
  return data;
}
