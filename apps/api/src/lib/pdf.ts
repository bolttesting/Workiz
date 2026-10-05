import path from "node:path";
import { fileURLToPath } from "node:url";
import PDFDocument from "pdfkit";
import { buildInvoicePdf } from "./invoice-pdf.js";
import { putBuffer, s3Configured } from "./s3.js";

const fontsDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../assets/fonts");

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
  kindLabel?: string;
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

const certificateNavy = "#102846";
const certificateGold = "#b69856";
const certificateGoldLight = "#e7d7a8";
const certificateGoldDeep = "#8f7338";
const certificateInk = "#24364c";
const certificateMuted = "#3d4f66";

function drawCertificateWaves(doc: PDFKit.PDFDocument, pageWidth: number, pageHeight: number) {
  doc.save();
  doc.strokeColor("#e7eef4").lineWidth(30).lineCap("round").strokeOpacity(0.7);
  const curves: Array<[number, number, number, number, number, number, number, number]> = [
    [-60, 90, 160, -10, 380, 210, pageWidth + 40, 40],
    [-40, 250, 220, 140, 520, 360, pageWidth + 30, 210],
    [40, pageHeight + 10, 280, pageHeight - 160, 560, pageHeight + 40, pageWidth + 20, pageHeight - 80],
    [180, -30, 420, 150, 640, -20, pageWidth + 40, 170],
  ];
  for (const [x, y, c1x, c1y, c2x, c2y, x2, y2] of curves) {
    doc.moveTo(x, y).bezierCurveTo(c1x, c1y, c2x, c2y, x2, y2).stroke();
  }
  doc.restore();
}

function drawCertificateFrame(doc: PDFKit.PDFDocument, x: number, y: number, w: number, h: number, r: number) {
  doc.save();
  doc.moveTo(x + r, y);
  doc.lineTo(x + w - r, y);
  doc.quadraticCurveTo(x + w - r, y + r, x + w, y + r);
  doc.lineTo(x + w, y + h - r);
  doc.quadraticCurveTo(x + w - r, y + h - r, x + w - r, y + h);
  doc.lineTo(x + r, y + h);
  doc.quadraticCurveTo(x + r, y + h - r, x, y + h - r);
  doc.lineTo(x, y + r);
  doc.quadraticCurveTo(x + r, y + r, x + r, y);
  doc.closePath();
  doc.lineWidth(1.7).lineJoin("round").strokeColor(certificateNavy).stroke();
  doc.restore();
}

function drawCertificateRibbons(doc: PDFKit.PDFDocument, cx: number, cy: number) {
  doc.save();
  doc.fillColor(certificateNavy);
  const top = cy + 14;
  doc.moveTo(cx - 1, top);
  doc.lineTo(cx - 26, top + 30);
  doc.lineTo(cx - 19, top + 44);
  doc.lineTo(cx - 11, top + 34);
  doc.lineTo(cx - 3, top + 44);
  doc.lineTo(cx + 5, top + 6);
  doc.closePath();
  doc.fill();
  doc.moveTo(cx + 1, top);
  doc.lineTo(cx + 26, top + 30);
  doc.lineTo(cx + 19, top + 44);
  doc.lineTo(cx + 11, top + 34);
  doc.lineTo(cx + 3, top + 44);
  doc.lineTo(cx - 5, top + 6);
  doc.closePath();
  doc.fill();
  doc.restore();
}

function drawCertificateSeal(doc: PDFKit.PDFDocument, cx: number, cy: number) {
  const scallops = 26;
  const base = 31;
  const bump = 5;
  const start = -Math.PI / 2;
  const point = (index: number, radius: number) => {
    const angle = start + (index / scallops) * Math.PI * 2;
    return [cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius] as const;
  };
  doc.save();
  const [startX, startY] = point(0, base);
  doc.moveTo(startX, startY);
  for (let i = 0; i < scallops; i += 1) {
    const [controlX, controlY] = point(i + 0.5, base + bump);
    const [endX, endY] = point(i + 1, base);
    doc.quadraticCurveTo(controlX, controlY, endX, endY);
  }
  doc.closePath();
  doc.fillColor(certificateGoldDeep).fill();
  doc.circle(cx, cy, 24).fill(certificateGold);
  doc.circle(cx, cy, 21.5).lineWidth(2.6).strokeColor(certificateNavy).stroke();
  const shine = doc.linearGradient(cx - 16, cy - 16, cx + 18, cy + 18);
  shine.stop(0, "#f8f1dc").stop(0.42, certificateGoldLight).stop(1, "#8d7040");
  doc.circle(cx, cy, 17.2).fill(shine);
  doc.circle(cx, cy, 17.2).lineWidth(0.6).strokeColor(certificateGoldDeep).stroke();
  doc.restore();
}

function fittedSize(doc: PDFKit.PDFDocument, text: string, maxWidth: number, start: number, min: number) {
  let size = start;
  doc.fontSize(size);
  while (size > min && doc.widthOfString(text) > maxWidth) {
    size -= 0.5;
    doc.fontSize(size);
  }
  return size;
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
  const doc = new PDFDocument({ size: "A4", layout: "landscape", margin: 0 });
  doc.registerFont("Serif", path.join(fontsDir, "PlayfairDisplay-Regular.ttf"));
  doc.registerFont("SerifItalic", path.join(fontsDir, "PlayfairDisplay-Italic.ttf"));
  doc.registerFont("Script", path.join(fontsDir, "GreatVibes-Regular.ttf"));

  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;
  const margin = 26;
  const corner = 34;
  doc.rect(0, 0, pageWidth, pageHeight).fill("#ffffff");
  drawCertificateWaves(doc, pageWidth, pageHeight);
  drawCertificateFrame(doc, margin, margin, pageWidth - margin * 2, pageHeight - margin * 2, corner);

  const innerLeft = 78;
  const innerWidth = pageWidth - innerLeft * 2;
  const issuer = (input.issuer?.trim() || "WORKIZ").toUpperCase();
  const learner = input.learnerName.trim() || "Learner";
  const course = input.courseTitle.trim() || "Course";
  const company = input.companyName?.trim() || "";
  const code = (input.number?.trim() || input.id).toUpperCase();

  const logoHeight = 50;
  const logoWidth = logoHeight * (122 / 145);
  const logoY = 32;
  doc.image(path.join(fontsDir, "..", "logo.png"), (pageWidth - logoWidth) / 2, logoY, {
    width: logoWidth,
    height: logoHeight,
  });
  doc.fillColor(certificateNavy).font("Serif").fontSize(12).text(issuer, innerLeft, logoY + logoHeight + 6, {
    width: innerWidth,
    align: "center",
    characterSpacing: 3.4,
  });
  doc.font("Serif").fontSize(58).text("Certificate", innerLeft, 112, {
    width: innerWidth,
    align: "center",
    characterSpacing: 0,
  });
  doc.font("Serif").fontSize(15).text("OF COMPLETION", innerLeft, 184, {
    width: innerWidth,
    align: "center",
    characterSpacing: 3,
  });
  doc.fillColor(certificateMuted).font("Serif").fontSize(14).text("This certificate is given to", innerLeft, 212, {
    width: innerWidth,
    align: "center",
    characterSpacing: 0,
  });

  const nameTop = 232;
  doc.font("Script").fillColor(certificateNavy);
  const nameSize = fittedSize(doc, learner, innerWidth - 20, 54, 28);
  doc.fontSize(nameSize).text(learner, innerLeft, nameTop, {
    width: innerWidth,
    align: "center",
    characterSpacing: 0,
  });

  doc.font("Script").fontSize(nameSize);
  const nameWidth = doc.widthOfString(learner);
  const ruleWidth = Math.min(innerWidth - 80, Math.max(240, nameWidth + 28));
  const ruleY = nameTop + nameSize * 1.12;
  doc.save();
  doc.strokeColor("#c5ced6").lineWidth(0.75);
  doc.moveTo((pageWidth - ruleWidth) / 2, ruleY).lineTo((pageWidth + ruleWidth) / 2, ruleY).stroke();
  doc.restore();

  const courseLine = `for completing ${course}`;
  let textBottom = ruleY + 14;
  doc.fillColor(certificateInk).font("SerifItalic").fontSize(18).text(courseLine, innerLeft, textBottom, {
    width: innerWidth,
    align: "center",
    characterSpacing: 0,
  });
  textBottom += doc.heightOfString(courseLine, { width: innerWidth }) + 2;
  if (company) {
    doc.fillColor(certificateMuted).font("SerifItalic").fontSize(14).text(company, innerLeft, textBottom, {
      width: innerWidth,
      align: "center",
      characterSpacing: 0,
    });
    textBottom += doc.heightOfString(company, { width: innerWidth });
  }

  const sealY = Math.min(pageHeight - 96, Math.max(textBottom + 42, pageHeight - 122));
  drawCertificateRibbons(doc, pageWidth / 2, sealY);
  drawCertificateSeal(doc, pageWidth / 2, sealY);

  const issued = input.issuedAt
    .toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
    .toUpperCase();
  const signWidth = 190;
  const footerY = pageHeight - 78;
  drawCertificateSignOff(doc, 78, footerY, signWidth, issued, "issued");
  drawCertificateSignOff(doc, pageWidth - 78 - signWidth, footerY, signWidth, code, "certificate");

  return collectPdf(doc);
}

function drawCertificateSignOff(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  width: number,
  value: string,
  label: string,
) {
  doc.save();
  doc.font("Serif").fillColor(certificateNavy);
  const size = fittedSize(doc, value, width - 4, 11, 8);
  doc.fontSize(size).text(value, x, y, { width, align: "center", lineBreak: false });
  doc.font("SerifItalic").fontSize(10).fillColor(certificateMuted).text(label, x, y + 16, {
    width,
    align: "center",
  });
  doc.restore();
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
