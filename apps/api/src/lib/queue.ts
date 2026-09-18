import { Queue } from "bullmq";
import IORedis from "ioredis";

export type TranscodeJob = { assetId: string; lessonId: string; originalKey: string };
export type PdfJob =
  | { kind: "invoice"; orderId: string }
  | { kind: "certificate"; userId: string; courseId: string };

function connection() {
  const url = process.env.REDIS_URL || "redis://127.0.0.1:6379";
  return new IORedis(url, { maxRetriesPerRequest: null });
}

let transcode: Queue<TranscodeJob> | null = null;
let pdf: Queue<PdfJob> | null = null;

export function transcodeQueue() {
  transcode ??= new Queue<TranscodeJob>("workix-transcode", { connection: connection() });
  return transcode;
}

export function pdfQueue() {
  pdf ??= new Queue<PdfJob>("workix-pdf", { connection: connection() });
  return pdf;
}
