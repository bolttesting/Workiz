import PDFDocument from "pdfkit";

export type TrainingRow = {
  course: string;
  status: string;
  dueAt: string | null;
  spent: string;
  certificate: string | null;
};

function collectPdf(doc: PDFKit.PDFDocument) {
  const chunks: Buffer[] = [];
  return new Promise<Buffer>((resolve, reject) => {
    doc.on("data", (chunk) => chunks.push(chunk as Buffer));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.end();
  });
}

export async function buildTrainingRecordPdf(input: {
  person: string;
  email: string;
  company: string;
  rows: TrainingRow[];
}) {
  const navy = "#102846";
  const doc = new PDFDocument({ size: "A4", margin: 48 });
  doc.fillColor(navy).font("Helvetica-Bold").fontSize(18).text("Training record", { align: "left" });
  doc.moveDown(0.3);
  doc.font("Helvetica").fontSize(11).fillColor("#1c3148").text(input.person);
  doc.fillColor("#3d4f66").fontSize(10).text(input.email);
  doc.text(input.company);
  doc.moveDown(0.8);
  doc.strokeColor("#e4eaf1").moveTo(48, doc.y).lineTo(547, doc.y).stroke();
  doc.moveDown(0.6);

  if (!input.rows.length) {
    doc.fillColor("#3d4f66").fontSize(11).text("No courses are assigned yet.");
    return collectPdf(doc);
  }

  for (const row of input.rows) {
    doc.fillColor(navy).font("Helvetica-Bold").fontSize(12).text(row.course);
    doc.fillColor("#3d4f66").font("Helvetica").fontSize(10).text(
      `${row.status} · Time ${row.spent}${row.dueAt ? ` · Due ${row.dueAt}` : ""}`,
    );
    doc.text(row.certificate ? `Certificate ${row.certificate}` : "No certificate yet");
    doc.moveDown(0.6);
  }

  return collectPdf(doc);
}
