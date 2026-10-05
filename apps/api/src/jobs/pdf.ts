import { ensureCertificateNumber } from "../lib/certificate-code.js";
import { companyNameForUser } from "../lib/org-note.js";
import { getPlatformSettings } from "../lib/platform-settings.js";
import { adminDb } from "../lib/db.js";
import { nextInvoiceNumber } from "../lib/access.js";
import { renderCertificatePdf, renderInvoicePdf } from "../lib/pdf.js";
import { certificateEmail, emailAmount, invoiceEmail, sendMail } from "../lib/mail.js";
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
    const { data: existing } = await adminDb.from("invoices").select("*").eq("order_id", order.id).maybeSingle();
    const number = existing?.number ?? nextInvoiceNumber();
    const seats = order.kind !== "course";
    const description = seats
      ? `${order.seat_quantity ?? 0} seat${order.seat_quantity === 1 ? "" : "s"}`
      : (course?.title ?? "WORKIZ course");
    const pdf_key = await renderInvoicePdf({
      number,
      customerName: profile?.full_name || profile?.email || "Customer",
      customerEmail: profile?.email || "",
      kindLabel: seats ? "Package" : "Course",
      description,
      amountCents: order.amount_cents,
      currency: order.currency,
      issuedAt: existing?.issued_at ? new Date(existing.issued_at) : new Date(),
    });
    if (existing) {
      if (pdf_key) await adminDb.from("invoices").update({ pdf_key }).eq("id", existing.id);
    } else {
      await adminDb.from("invoices").insert({
        order_id: order.id,
        number,
        pdf_key,
        amount_cents: order.amount_cents,
        currency: "aed",
      });
    }
    if (profile?.email && profile.role !== "company_learner") {
      await sendMail({
        to: profile.email,
        subject: `Invoice ${number}`,
        html: invoiceEmail({
          number,
          amount: emailAmount(order.amount_cents),
          href: `${urls().learn}/invoices`,
        }),
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
  const number = await ensureCertificateNumber(cert.id, cert.number ?? null);
  const companyName = await companyNameForUser(cert.user_id);
  const platform = await getPlatformSettings();
  const pdf_key = await renderCertificatePdf({
    learnerName: profile.full_name || profile.email,
    courseTitle: course.title,
    issuedAt: new Date(),
    id: cert.id,
    number,
    companyName,
    issuer: platform.certificateIssuer,
  });
  if (pdf_key) await adminDb.from("certificates").update({ pdf_key }).eq("id", cert.id);
  await sendMail({
    to: profile.email,
    subject: `Certificate: ${course.title}`,
    html: certificateEmail({ course: course.title, href: `${urls().learn}/certificates` }),
  });
}
