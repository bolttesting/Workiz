import { Hono } from "hono";
import { ensureInvoiceForOrder } from "../lib/access.js";
import { adminDb } from "../lib/db.js";
import { canDownloadInvoice, loadInvoiceForPdf } from "../lib/invoice-pdf.js";
import { storeMediaFile } from "../lib/media-store.js";
import { ensureCertificateNumber } from "../lib/certificate-code.js";
import { gatesForUser } from "../lib/course-gate.js";
import { companyNameForUser, getOrgNote } from "../lib/org-note.js";
import { getPlatformSettings } from "../lib/platform-settings.js";
import { leadFlags } from "../lib/leads.js";
import { buildCertificatePdf } from "../lib/pdf.js";
import type { Authed } from "../lib/auth.js";

const AVATAR_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export const me = new Hono<{ Variables: { auth: Authed } }>();

me.get("/", async (c) => {
  const auth = c.get("auth");
  let organization = null;
  if (auth.profile.organization_id) {
    const { data } = await adminDb.from("organizations").select("*").eq("id", auth.profile.organization_id).single();
    const note = await getOrgNote(auth.profile.organization_id);
    organization = data ? { ...data, dashboard_note: note } : null;
  }
  const lead = (await leadFlags([auth.userId]))[auth.userId] ?? false;
  return c.json({ profile: { ...auth.profile, department_lead: lead }, organization });
});

me.post("/avatar", async (c) => {
  const auth = c.get("auth");
  const form = await c.req.parseBody({ all: true });
  const file = form["file"];
  if (!file || typeof file === "string") return c.json({ error: "Choose an image." }, 400);
  const blob = file as File;
  const contentType = blob.type || "application/octet-stream";
  if (!AVATAR_TYPES.has(contentType)) return c.json({ error: "Use a JPG, PNG, or WebP image." }, 400);
  if (blob.size > 2_000_000) return c.json({ error: "Image must be under 2 MB." }, 400);

  try {
    const bytes = Buffer.from(await blob.arrayBuffer());
    const stored = await storeMediaFile({
      bytes,
      folder: "misc",
      fileName: blob.name || "avatar.jpg",
      contentType,
    });
    const { data, error } = await adminDb
      .from("profiles")
      .update({ avatar_url: stored.publicUrl })
      .eq("id", auth.userId)
      .select("*")
      .single();
    if (error) return c.json({ error: error.message }, 500);
    return c.json({ profile: data, avatarUrl: stored.publicUrl });
  } catch (err) {
    return c.json({ error: (err as Error).message }, 503);
  }
});

me.get("/enrollments", async (c) => {
  const auth = c.get("auth");
  const { data: paidOrders } = await adminDb
    .from("orders")
    .select("course_id")
    .eq("user_id", auth.userId)
    .eq("status", "paid")
    .not("course_id", "is", null);
  for (const order of paidOrders ?? []) {
    if (!order.course_id) continue;
    await adminDb.from("enrollments").upsert(
      { user_id: auth.userId, course_id: order.course_id, source: "purchase" },
      { onConflict: "user_id,course_id" },
    );
  }
  const { data: enrollments } = await adminDb.from("enrollments").select("*").eq("user_id", auth.userId);
  const ids = (enrollments ?? []).map((e) => e.course_id);
  const { data: courses } = ids.length ? await adminDb.from("courses").select("*").in("id", ids) : { data: [] as never[] };
  const gates = await gatesForUser(auth.profile, ids);
  return c.json({ enrollments: enrollments ?? [], courses: courses ?? [], gates });
});

me.get("/progress", async (c) => {
  const auth = c.get("auth");
  const { data } = await adminDb.from("lesson_progress").select("*").eq("user_id", auth.userId);
  return c.json({ progress: data ?? [] });
});

me.get("/certificates", async (c) => {
  const auth = c.get("auth");
  const { data } = await adminDb.from("certificates").select("*").eq("user_id", auth.userId);
  const certificates = [];
  for (const cert of data ?? []) {
    const number = await ensureCertificateNumber(cert.id, cert.number ?? null);
    certificates.push({ ...cert, number: number ?? cert.number ?? null });
  }
  return c.json({ certificates });
});

me.get("/certificates/:id/pdf", async (c) => {
  const auth = c.get("auth");
  const { data: cert } = await adminDb.from("certificates").select("*").eq("id", c.req.param("id")).maybeSingle();
  if (!cert) return c.json({ error: "Not found" }, 404);
  const sameCompany =
    auth.profile.role === "company_admin" &&
    auth.profile.organization_id &&
    (await adminDb.from("profiles").select("organization_id").eq("id", cert.user_id).maybeSingle()).data?.organization_id ===
      auth.profile.organization_id;
  if (cert.user_id !== auth.userId && auth.profile.role !== "super_admin" && !sameCompany) {
    return c.json({ error: "Forbidden" }, 403);
  }
  const { data: profile } = await adminDb.from("profiles").select("full_name, email").eq("id", cert.user_id).maybeSingle();
  const { data: course } = await adminDb.from("courses").select("title").eq("id", cert.course_id).maybeSingle();
  if (!course) return c.json({ error: "Not found" }, 404);
  const number = await ensureCertificateNumber(cert.id, cert.number ?? null);
  const companyName = await companyNameForUser(cert.user_id);
  const platform = await getPlatformSettings();
  const buffer = await buildCertificatePdf({
    learnerName: profile?.full_name || profile?.email || "Learner",
    courseTitle: course.title,
    issuedAt: cert.issued_at ? new Date(cert.issued_at) : new Date(),
    id: cert.id,
    number,
    companyName,
    issuer: platform.certificateIssuer,
  });
  const filename = `${course.title.replace(/[^\w]+/g, "-").replace(/^-|-$/g, "") || "certificate"}.pdf`;
  return c.body(new Uint8Array(buffer), 200, {
    "Content-Type": "application/pdf",
    "Content-Disposition": `attachment; filename="${filename}"`,
  });
});

me.get("/invoices", async (c) => {
  const auth = c.get("auth");
  const { data: ownOrders } = await adminDb.from("orders").select("*").eq("user_id", auth.userId);
  const orders = [...(ownOrders ?? [])];
  if (auth.profile.role === "company_admin" && auth.profile.organization_id) {
    const { data: orgOrders } = await adminDb
      .from("orders")
      .select("*")
      .eq("organization_id", auth.profile.organization_id);
    const seen = new Set(orders.map((order) => order.id));
    for (const order of orgOrders ?? []) {
      if (!seen.has(order.id)) orders.push(order);
    }
  }
  for (const order of orders) {
    if (order.status === "paid") await ensureInvoiceForOrder(order);
  }
  const orderIds = orders.map((order) => order.id);
  const { data: invoices } = orderIds.length
    ? await adminDb.from("invoices").select("*").in("order_id", orderIds)
    : { data: [] as never[] };
  return c.json({ orders, invoices: invoices ?? [] });
});

me.get("/invoices/:id/pdf", async (c) => {
  const auth = c.get("auth");
  const loaded = await loadInvoiceForPdf(c.req.param("id"));
  if (!loaded) return c.json({ error: "Not found" }, 404);
  if (!canDownloadInvoice(auth, loaded.order)) return c.json({ error: "Forbidden" }, 403);
  const filename = `${loaded.invoice.number}.pdf`;
  return c.body(new Uint8Array(loaded.buffer), 200, {
    "Content-Type": "application/pdf",
    "Content-Disposition": `attachment; filename="${filename}"`,
  });
});
