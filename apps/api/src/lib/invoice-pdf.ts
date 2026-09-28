import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import PDFDocument from "pdfkit";
import { DIRHAM_SIGN, formatMoney } from "@workix/config";
import { adminDb } from "./db.js";
import type { Authed } from "./auth.js";

const fontFile = join(dirname(fileURLToPath(import.meta.url)), "../../assets/dirham.woff2");

function collectPdf(doc: PDFKit.PDFDocument) {
  const chunks: Buffer[] = [];
  return new Promise<Buffer>((resolve, reject) => {
    doc.on("data", (chunk) => chunks.push(chunk as Buffer));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.end();
  });
}

function writeMoney(doc: PDFKit.PDFDocument, cents: number) {
  const amount = (cents / 100).toLocaleString("en-AE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const canSign = existsSync(fontFile);
  doc.fontSize(16).fillColor("#102846");
  if (canSign) {
    try {
      doc.font("Dirham").text(DIRHAM_SIGN, { continued: true });
      doc.font("Helvetica").text(`  ${amount}`);
      return;
    } catch {
      /* Helvetica fallback below */
    }
  }
  doc.font("Helvetica").text(`${DIRHAM_SIGN}  ${amount}`);
}

export async function buildInvoicePdf(input: {
  number: string;
  customerName: string;
  customerEmail: string;
  description: string;
  amountCents: number;
  issuedAt: Date;
}) {
  const doc = new PDFDocument({ size: "A4", margin: 56 });
  if (existsSync(fontFile)) {
    try {
      doc.registerFont("Dirham", fontFile);
    } catch {
      /* sign falls back to the unicode character */
    }
  }
  doc.font("Helvetica");
  doc.fontSize(22).fillColor("#102846").text("WORKIZ");
  doc.moveDown(0.3);
  doc.fontSize(11).fillColor("#555").text("Invoice");
  doc.moveDown();
  doc.fillColor("#111").fontSize(12);
  doc.text(`Invoice ${input.number}`);
  doc.text(`Date ${input.issuedAt.toLocaleDateString("en-GB")}`);
  doc.moveDown();
  doc.text(input.customerName || "Customer");
  if (input.customerEmail) doc.text(input.customerEmail);
  doc.moveDown();
  doc.text(input.description);
  doc.moveDown();
  doc.fontSize(12).fillColor("#555").text("Total");
  writeMoney(doc, input.amountCents);
  doc.moveDown(2);
  doc.font("Helvetica").fontSize(9).fillColor("#777").text("Thank you for learning with WORKIZ. Amounts are in UAE Dirhams.");
  return collectPdf(doc);
}

export function formatDirham(cents: number) {
  return formatMoney(cents, "aed");
}

export async function loadInvoiceForPdf(invoiceId: string) {
  const { data: invoice } = await adminDb.from("invoices").select("*").eq("id", invoiceId).maybeSingle();
  if (!invoice) return null;
  const { data: order } = await adminDb.from("orders").select("*").eq("id", invoice.order_id).maybeSingle();
  if (!order) return null;
  const { data: profile } = order.user_id
    ? await adminDb.from("profiles").select("full_name, email").eq("id", order.user_id).maybeSingle()
    : { data: null };
  const { data: course } = order.course_id
    ? await adminDb.from("courses").select("title").eq("id", order.course_id).maybeSingle()
    : { data: null };
  const description =
    order.kind === "course"
      ? `Course: ${course?.title ?? "WORKIZ course"}`
      : `Company seats x${order.seat_quantity ?? 0}`;
  const buffer = await buildInvoicePdf({
    number: invoice.number,
    customerName: profile?.full_name || profile?.email || "Customer",
    customerEmail: profile?.email || "",
    description,
    amountCents: invoice.amount_cents,
    issuedAt: invoice.issued_at ? new Date(invoice.issued_at) : new Date(),
  });
  return { invoice, order, buffer };
}

export function canDownloadInvoice(
  auth: Authed,
  order: { user_id?: string | null; organization_id?: string | null },
) {
  if (auth.profile.role === "super_admin") return true;
  if (order.user_id && order.user_id === auth.userId) return true;
  if (
    auth.profile.role === "company_admin" &&
    auth.profile.organization_id &&
    order.organization_id === auth.profile.organization_id
  ) {
    return true;
  }
  return false;
}
