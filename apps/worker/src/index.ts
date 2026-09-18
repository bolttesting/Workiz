import "./load-env.js";
import { Worker } from "bullmq";
import IORedis from "ioredis";
import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile, readFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { createAdminSupabase } from "@workix/db/admin";

type TranscodeJob = { assetId: string; lessonId: string; originalKey: string };
type PdfJob = { kind: "invoice"; orderId: string } | { kind: "certificate"; userId: string; courseId: string };

const connection = new IORedis(process.env.REDIS_URL || "redis://127.0.0.1:6379", {
  maxRetriesPerRequest: null,
});

function s3() {
  return new S3Client({
    region: process.env.S3_REGION || "auto",
    endpoint: process.env.S3_ENDPOINT || undefined,
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID || "",
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || "",
    },
  });
}

function bucket() {
  return process.env.S3_BUCKET || "";
}

function run(cmd: string, args: string[]) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: "inherit" });
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exited ${code}`))));
  });
}

async function transcode(job: TranscodeJob) {
  const db = createAdminSupabase();
  const dir = await mkdtemp(path.join(tmpdir(), "workix-hls-"));
  try {
    const obj = await s3().send(new GetObjectCommand({ Bucket: bucket(), Key: job.originalKey }));
    const bytes = await obj.Body!.transformToByteArray();
    const input = path.join(dir, "input.mp4");
    await writeFile(input, Buffer.from(bytes));
    const outDir = path.join(dir, "hls");
    await mkdir(outDir);
    await run("ffmpeg", [
      "-y",
      "-i",
      input,
      "-codec",
      "copy",
      "-start_number",
      "0",
      "-hls_time",
      "6",
      "-hls_list_size",
      "0",
      "-f",
      "hls",
      path.join(outDir, "index.m3u8"),
    ]).catch(async () => {
      await run("ffmpeg", [
        "-y",
        "-i",
        input,
        "-c:v",
        "libx264",
        "-c:a",
        "aac",
        "-hls_time",
        "6",
        "-hls_list_size",
        "0",
        "-f",
        "hls",
        path.join(outDir, "index.m3u8"),
      ]);
    });

    const prefix = `hls/${job.lessonId}`;
    const files = await import("node:fs/promises").then((fs) => fs.readdir(outDir));
    for (const file of files) {
      const body = await readFile(path.join(outDir, file));
      const contentType = file.endsWith(".m3u8") ? "application/vnd.apple.mpegurl" : "video/MP2T";
      await s3().send(
        new PutObjectCommand({
          Bucket: bucket(),
          Key: `${prefix}/${file}`,
          Body: body,
          ContentType: contentType,
        }),
      );
    }
    await db.from("media_assets").update({ status: "ready", hls_prefix: prefix, error_message: null }).eq("id", job.assetId);
  } catch (err) {
    await db
      .from("media_assets")
      .update({ status: "failed", error_message: (err as Error).message })
      .eq("id", job.assetId);
    throw err;
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

new Worker<TranscodeJob>(
  "workix-transcode",
  async (job) => {
    console.log("transcode", job.data.lessonId);
    await transcode(job.data);
  },
  { connection, concurrency: 1 },
);

new Worker<PdfJob>(
  "workix-pdf",
  async (job) => {
    const api = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
    const res = await fetch(`${api}/internal/pdf`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-secret": process.env.INTERNAL_JOB_SECRET || "",
      },
      body: JSON.stringify(job.data),
    });
    if (!res.ok) throw new Error(await res.text());
  },
  { connection, concurrency: 2 },
);

console.log("WORKIZ worker listening");
