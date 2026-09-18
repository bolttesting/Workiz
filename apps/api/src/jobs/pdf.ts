import { adminDb } from "../lib/db.js";
import { nextInvoiceNumber } from "../lib/access.js";
import { renderCertificatePdf, renderInvoicePdf } from "../lib/pdf.js";
import { sendMail } from "../lib/mail.js";
import { urls } from "../lib/auth.js";
import type { PdfJob } from "../lib/queue.js";

export async function processPdfJob(job: PdfJob) {
  if (job.kind === "invoice") {
    const { data: order } = await adminDb.from("orders").select("*").eq("id", job.orderId).single();
    if (!order) return;
    const { data: profile } = order.user_id
      ? await adminDb.from("profiles").select("*").eq("id", order.user_id).single()
      : { data: null };
    const { data: course } = order.course_id
      ? await adminDb.from("courses").select("title").eq("id", order.course_id).single()
      : { data: null };
    const number = nextInvoiceNumber();
    const description =
      order.kind === "course"
        ? `Course: ${course?.title ?? "WORKIZ course"}`
        : `Company seats x${order.seat_quantity ?? 0}`;
    const pdf_key = await renderInvoicePdf({
      number,
      customerName: profile?.full_name || profile?.email || "Customer",
      customerEmail: profile?.email || "",
      description,
      amountCents: order.amount_cents,
      currency: order.currency,
      issuedAt: new Date(),
    });
    await adminDb.from("invoices").insert({
      order_id: order.id,
      number,
      pdf_key,
      amount_cents: order.amount_cents,
      currency: order.currency,
    });
    if (profile?.email) {
      await sendMail({
        to: profile.email,
        subject: `Invoice ${number}`,
        html: `<p>Your invoice ${number} is ready.</p><p>Amount ${(order.amount_cents / 100).toFixed(2)} ${order.currency.toUpperCase()}</p>`,
      });
    }
    return;
  }

  const { data: profile } = await adminDb.from("profiles").select("*").eq("id", job.userId).single();
  const { data: course } = await adminDb.from("courses").select("*").eq("id", job.courseId).single();
  const { data: cert } = await adminDb
    .from("certificates")
    .select("*")
    .eq("user_id", job.userId)
    .eq("course_id", job.courseId)
    .maybeSingle();
  if (!profile || !course || !cert) return;
  const pdf_key = await renderCertificatePdf({
    learnerName: profile.full_name || profile.email,
    courseTitle: course.title,
    issuedAt: new Date(),
    id: cert.id,
  });
  await adminDb.from("certificates").update({ pdf_key }).eq("id", cert.id);
  await sendMail({
    to: profile.email,
    subject: `Certificate: ${course.title}`,
    html: `<p>You completed ${course.title}.</p><p><a href="${urls().learn}/certificates">Download your certificate</a></p>`,
  });
}
