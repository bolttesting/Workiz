import PDFDocument from "pdfkit";
import { buildInvoicePdf } from "./invoice-pdf.js";
import { putBuffer, s3Configured } from "./s3.js";

function collectPdf(doc: PDFKit.PDFDocument) {
  const chunks: Buffer[] = [];
  return new Promise<Buffer>((resolve, reject) => {
    doc.on("data", (c) => chunks.push(c as Buffer));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.end();
  });
}

export async function renderInvoicePdf(input: {
  number: string;
  customerName: string;
  customerEmail: string;
  description: string;
  amountCents: number;
  currency: string;
  issuedAt: Date;
}) {
  const buffer = await buildInvoicePdf(input);
  const key = `invoices/${input.number}.pdf`;
  if (!s3Configured()) return null;
  try {
    await putBuffer(key, buffer, "application/pdf");
    return key;
  } catch {
    return null;
  }
}

export async function buildCertificatePdf(input: {
  learnerName: string;
  courseTitle: string;
  issuedAt: Date;
  id: string;
  number?: string | null;
  companyName?: string | null;
  issuer?: string | null;
}) {
  const doc = new PDFDocument({ size: "A4", layout: "landscape", margin: 48 });
  doc.fontSize(14).fillColor("#b69856").text(input.issuer?.trim() || "WORKIZ", { align: "center" });
  doc.moveDown();
  doc.fontSize(28).fillColor("#102846").text("Certificate of Completion", { align: "center" });
  doc.moveDown(1.5);
  doc.fontSize(12).fillColor("#555").text("This certifies that", { align: "center" });
  doc.moveDown(0.5);
  doc.fontSize(24).fillColor("#111").text(input.learnerName, { align: "center" });
  if (input.companyName) {
    doc.moveDown(0.3);
    doc.fontSize(12).fillColor("#555").text(input.companyName, { align: "center" });
  }
  doc.moveDown(0.5);
  doc.fontSize(12).fillColor("#555").text("has completed", { align: "center" });
  doc.moveDown(0.4);
  doc.fontSize(18).fillColor("#111").text(input.courseTitle, { align: "center" });
  doc.moveDown(1.2);
  doc.fontSize(11).fillColor("#555").text(input.issuedAt.toLocaleDateString("en-GB"), { align: "center" });
  doc.fontSize(9).text(input.number ? `Certificate ${input.number}` : `ID ${input.id}`, { align: "center" });
  return collectPdf(doc);
}

export async function renderCertificatePdf(input: {
  learnerName: string;
  courseTitle: string;
  issuedAt: Date;
  id: string;
  number?: string | null;
  companyName?: string | null;
  issuer?: string | null;
}) {
  const buffer = await buildCertificatePdf(input);
  const key = `certificates/${input.id}.pdf`;
  if (!s3Configured()) return null;
  try {
    await putBuffer(key, buffer, "application/pdf");
    return key;
  } catch {
    return null;
  }
}
