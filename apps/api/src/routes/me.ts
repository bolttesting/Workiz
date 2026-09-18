import { Hono } from "hono";
import { adminDb } from "../lib/db.js";
import { presignGet } from "../lib/s3.js";
import type { Authed } from "../lib/auth.js";

export const me = new Hono<{ Variables: { auth: Authed } }>();

me.get("/", async (c) => {
  const auth = c.get("auth");
  let organization = null;
  if (auth.profile.organization_id) {
    const { data } = await adminDb.from("organizations").select("*").eq("id", auth.profile.organization_id).single();
    organization = data;
  }
  return c.json({ profile: auth.profile, organization });
});

me.get("/enrollments", async (c) => {
  const auth = c.get("auth");
  const { data: enrollments } = await adminDb.from("enrollments").select("*").eq("user_id", auth.userId);
  const ids = (enrollments ?? []).map((e) => e.course_id);
  const { data: courses } = ids.length ? await adminDb.from("courses").select("*").in("id", ids) : { data: [] as never[] };
  return c.json({ enrollments: enrollments ?? [], courses: courses ?? [] });
});

me.get("/progress", async (c) => {
  const auth = c.get("auth");
  const { data } = await adminDb.from("lesson_progress").select("*").eq("user_id", auth.userId);
  return c.json({ progress: data ?? [] });
});

me.get("/certificates", async (c) => {
  const auth = c.get("auth");
  const { data } = await adminDb.from("certificates").select("*").eq("user_id", auth.userId);
  const withUrls = await Promise.all(
    (data ?? []).map(async (cert) => ({
      ...cert,
      url: cert.pdf_key ? await presignGet(cert.pdf_key, 180).catch(() => null) : null,
    })),
  );
  return c.json({ certificates: withUrls });
});

me.get("/invoices", async (c) => {
  const auth = c.get("auth");
  const { data: orders } = await adminDb.from("orders").select("*").eq("user_id", auth.userId);
  const orderIds = (orders ?? []).map((o) => o.id);
  const { data: invoices } = orderIds.length
    ? await adminDb.from("invoices").select("*").in("order_id", orderIds)
    : { data: [] as never[] };
  return c.json({ orders: orders ?? [], invoices: invoices ?? [] });
});
