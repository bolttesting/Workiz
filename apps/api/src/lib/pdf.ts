import PDFDocument from "pdfkit";
import { putBuffer } from "./s3.js";

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
  const doc = new PDFDocument({ size: "A4", margin: 56 });
  doc.fontSize(22).fillColor("#102846").text("WORKIZ", { continued: false });
  doc.moveDown(0.3);
  doc.fontSize(11).fillColor("#555").text("Invoice");
  doc.moveDown();
  doc.fillColor("#111").fontSize(12);
  doc.text(`Invoice ${input.number}`);
  doc.text(`Date ${input.issuedAt.toLocaleDateString("en-GB")}`);
  doc.moveDown();
  doc.text(input.customerName);
  doc.text(input.customerEmail);
  doc.moveDown();
  doc.text(input.description);
  doc.moveDown();
  const amount = (input.amountCents / 100).toFixed(2);
  doc.fontSize(16).text(`Total  ${input.currency.toUpperCase()} ${amount}`);
  doc.moveDown(2);
  doc.fontSize(9).fillColor("#777").text("Thank you for learning with WORKIZ.");
  const buffer = await collectPdf(doc);
  const key = `invoices/${input.number}.pdf`;
  await putBuffer(key, buffer, "application/pdf");
  return key;
}

export async function renderCertificatePdf(input: {
  learnerName: string;
  courseTitle: string;
  issuedAt: Date;
  id: string;
}) {
  const doc = new PDFDocument({ size: "A4", layout: "landscape", margin: 48 });
  doc.fontSize(14).fillColor("#b69856").text("WORKIZ", { align: "center" });
  doc.moveDown();
  doc.fontSize(28).fillColor("#111").text("Certificate of Completion", { align: "center" });
  doc.moveDown(1.5);
  doc.fontSize(12).fillColor("#555").text("This certifies that", { align: "center" });
  doc.moveDown(0.5);
  doc.fontSize(24).fillColor("#111").text(input.learnerName, { align: "center" });
  doc.moveDown(0.5);
  doc.fontSize(12).fillColor("#555").text("has completed", { align: "center" });
  doc.moveDown(0.4);
  doc.fontSize(18).fillColor("#111").text(input.courseTitle, { align: "center" });
  doc.moveDown(1.2);
  doc.fontSize(11).fillColor("#555").text(input.issuedAt.toLocaleDateString("en-GB"), { align: "center" });
  doc.fontSize(9).text(`ID ${input.id}`, { align: "center" });
  const buffer = await collectPdf(doc);
  const key = `certificates/${input.id}.pdf`;
  await putBuffer(key, buffer, "application/pdf");
  return key;
}
