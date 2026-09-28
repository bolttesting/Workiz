import { Hono } from "hono";
import { adminDb } from "../lib/db.js";
import { companyNameForUser } from "../lib/org-note.js";

export const verify = new Hono();

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

verify.get("/certificates/verify", async (c) => {
  const code = (c.req.query("code") ?? "").trim().toUpperCase();
  if (code.length < 4) return c.json({ found: false });

  let cert: { id: string; user_id: string; course_id: string; issued_at: string; number?: string | null } | null = null;
  const byNumber = await adminDb.from("certificates").select("id, user_id, course_id, issued_at, number").eq("number", code).maybeSingle();
  if (!byNumber.error) cert = byNumber.data;
  if (!cert && uuidPattern.test(code)) {
    const byId = await adminDb.from("certificates").select("id, user_id, course_id, issued_at").eq("id", code).maybeSingle();
    if (byId.data) cert = { ...byId.data, number: null };
  }
  if (!cert) return c.json({ found: false });

  const { data: profile } = await adminDb.from("profiles").select("full_name").eq("id", cert.user_id).maybeSingle();
  const { data: course } = await adminDb.from("courses").select("title").eq("id", cert.course_id).maybeSingle();
  const companyName = await companyNameForUser(cert.user_id);
  return c.json({
    found: true,
    number: cert.number ?? null,
    learnerName: profile?.full_name || "Learner",
    companyName,
    courseTitle: course?.title ?? "Course",
    issuedAt: cert.issued_at,
  });
});
