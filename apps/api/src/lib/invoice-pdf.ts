import PDFDocument from "pdfkit";
import { formatMoney } from "@workix/config";
import { adminDb } from "./db.js";
import type { Authed } from "./auth.js";

function collectPdf(doc: PDFKit.PDFDocument) {
  const chunks: Buffer[] = [];
  return new Promise<Buffer>((resolve, reject) => {
    doc.on("data", (chunk) => chunks.push(chunk as Buffer));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.end();
  });
}

const navy = "#102846";
const gold = "#b69856";
const goldInk = "#8f7338";
const ink = "#1c3148";
const muted = "#3d4f66";
const line = "#e4eaf1";
const wash = "#f4f7fb";

function moneyLabel(cents: number) {
  const amount = (cents / 100).toLocaleString("en-AE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${amount} Dirham`;
}

function writeMoney(doc: PDFKit.PDFDocument, cents: number, x: number, y: number, width: number, size = 16) {
  doc.font("Helvetica-Bold").fontSize(size).fillColor(navy).text(moneyLabel(cents), x, y, {
    width,
    align: "right",
  });
}

export async function buildInvoicePdf(input: {
  number: string;
  customerName: string;
  customerEmail: string;
  description: string;
  kindLabel?: string;
  amountCents: number;
  issuedAt: Date;
}) {
  const doc = new PDFDocument({ size: "A4", margin: 0 });
  const pageWidth = doc.page.width;
  const left = 48;
  const right = pageWidth - 48;
  const width = right - left;

  doc.rect(0, 0, pageWidth, 108).fill(navy);
  doc.rect(left, 78, 42, 2).fill(gold);
  doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(18).text("WORKIZ", left, 36, { lineBreak: false });
  doc.font("Helvetica").fontSize(9);
  const invoiceLabelWidth = doc.widthOfString("INVOICE");
  doc.fillColor(gold).text("INVOICE", right - invoiceLabelWidth, 34, { lineBreak: false });
  doc.font("Helvetica-Bold").fontSize(12);
  const numberWidth = doc.widthOfString(input.number);
  doc.fillColor("#ffffff").text(input.number, right - numberWidth, 54, { lineBreak: false });

  doc.fillColor(goldInk).font("Helvetica-Bold").fontSize(8).text("FROM", left, 136, { lineBreak: false });
  doc.fillColor(navy).font("Helvetica-Bold").fontSize(12).text("Workiz Support Solutions - FZCO", left, 152, { width: 250 });
  doc.fillColor(muted).font("Helvetica").fontSize(10).text("Dubai Silicon Oasis\nDubai, United Arab Emirates", left, 172, { width: 250 });

  doc.fillColor(goldInk).font("Helvetica-Bold").fontSize(8).text("BILL TO", 330, 136, { lineBreak: false });
  doc.fillColor(navy).font("Helvetica-Bold").fontSize(12).text(input.customerName || "Customer", 330, 152, { width: 217 });
  if (input.customerEmail) {
    doc.fillColor(muted).font("Helvetica").fontSize(10).text(input.customerEmail, 330, 172, { width: right - 330 });
  }

  const metaY = 236;
  doc.roundedRect(left, metaY, width, 58, 8).fill(wash);
  const meta: Array<[string, string]> = [
    ["Invoice", input.number],
    ["Date", input.issuedAt.toLocaleDateString("en-GB")],
    ["Status", "Paid"],
  ];
  meta.forEach(([label, value], index) => {
    const x = left + 18 + index * (width / 3);
    doc.fillColor(muted).font("Helvetica").fontSize(8).text(label.toUpperCase(), x, metaY + 12, { lineBreak: false });
    doc.fillColor(index === 2 ? "#027a48" : navy).font("Helvetica-Bold").fontSize(11).text(value, x, metaY + 28, {
      lineBreak: false,
    });
  });

  const tableY = 322;
  doc.rect(left, tableY, width, 32).fill(navy);
  doc.fillColor("#ffffff").font("Helvetica").fontSize(9);
  doc.text("ITEM", left + 16, tableY + 11, { lineBreak: false });
  doc.text("DESCRIPTION", left + 130, tableY + 11, { lineBreak: false });
  doc.text("AMOUNT", right - 130, tableY + 11, { width: 114, align: "right", lineBreak: false });

  const rowY = tableY + 32;
  doc.rect(left, rowY, width, 56).fill("#ffffff");
  doc.moveTo(left, rowY + 56).lineTo(right, rowY + 56).strokeColor(line).lineWidth(1).stroke();
  doc.fillColor(ink).font("Helvetica-Bold").fontSize(11).text(input.kindLabel || "Training", left + 16, rowY + 20, {
    width: 100,
  });
  doc.fillColor(ink).font("Helvetica").fontSize(11).text(input.description, left + 130, rowY + 20, { width: 230 });
  writeMoney(doc, input.amountCents, right - 180, rowY + 18, 164, 12);

  const totalY = rowY + 84;
  doc.roundedRect(right - 230, totalY, 230, 72, 8).fill(wash);
  doc.fillColor(goldInk).font("Helvetica").fontSize(9).text("TOTAL", right - 214, totalY + 14, { lineBreak: false });
  writeMoney(doc, input.amountCents, right - 214, totalY + 34, 198, 16);

  const footY = doc.page.height - 72;
  doc.moveTo(left, footY).lineTo(right, footY).strokeColor(gold).lineWidth(1.5).stroke();
  doc.fillColor(muted).font("Helvetica").fontSize(9).text("Thank you for learning with WORKIZ.", left, footY + 14, {
    width,
    align: "left",
  });
  doc.text("Amounts are in UAE Dirhams.", left, footY + 28, { width });
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
  const seats = order.kind !== "course";
  const description = seats
    ? `${order.seat_quantity ?? 0} seat${order.seat_quantity === 1 ? "" : "s"}`
    : (course?.title ?? "WORKIZ course");
  const buffer = await buildInvoicePdf({
    number: invoice.number,
    customerName: profile?.full_name || profile?.email || "Customer",
    customerEmail: profile?.email || "",
    kindLabel: seats ? "Package" : "Course",
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
  if (auth.profile.role === "company_learner") return false;
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
