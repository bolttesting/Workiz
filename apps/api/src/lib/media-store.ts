import { nanoid } from "nanoid";
import { adminDb } from "./db.js";
import { putBuffer, s3Configured } from "./s3.js";

export type MediaFolder = "courses" | "blog" | "lessons" | "videos" | "misc";

export type StoredMedia = {
  key: string;
  publicUrl: string;
  byteSize: number;
  contentType: string;
  driver: "hostinger" | "s3" | "supabase";
};

const UPLOADS_BUCKET = "uploads";

export function hostingerConfigured() {
  return Boolean(process.env.MEDIA_UPLOAD_URL && process.env.MEDIA_UPLOAD_SECRET);
}

export function mediaPublicBase() {
  return (process.env.MEDIA_PUBLIC_BASE_URL || "").replace(/\/$/, "");
}

async function ensureUploadsBucket() {
  const { data: buckets } = await adminDb.storage.listBuckets();
  if (buckets?.some((b) => b.id === UPLOADS_BUCKET || b.name === UPLOADS_BUCKET)) return;
  const { error } = await adminDb.storage.createBucket(UPLOADS_BUCKET, {
    public: true,
    fileSizeLimit: 524_288_000,
  });
  if (error && !/already exists/i.test(error.message)) throw error;
}

async function storeOnHostinger(
  bytes: Buffer,
  folder: MediaFolder,
  fileName: string,
  contentType: string,
): Promise<StoredMedia> {
  const uploadUrl = process.env.MEDIA_UPLOAD_URL!;
  const secret = process.env.MEDIA_UPLOAD_SECRET!;
  const form = new FormData();
  form.append("folder", folder);
  form.append(
    "file",
    new Blob([new Uint8Array(bytes)], { type: contentType }),
    fileName,
  );

  const res = await fetch(uploadUrl, {
    method: "POST",
    headers: { "X-Upload-Secret": secret },
    body: form,
  });
  const json = (await res.json().catch(() => ({}))) as {
    error?: string;
    key?: string;
    publicUrl?: string;
    byteSize?: number;
    contentType?: string;
  };
  if (!res.ok) {
    throw new Error(json.error || `Hostinger upload failed (${res.status})`);
  }
  if (!json.key || !json.publicUrl) {
    throw new Error("Hostinger upload returned an incomplete response");
  }
  return {
    key: json.key,
    publicUrl: json.publicUrl,
    byteSize: json.byteSize ?? bytes.length,
    contentType: json.contentType || contentType,
    driver: "hostinger",
  };
}

async function storeOnS3(
  bytes: Buffer,
  folder: MediaFolder,
  fileName: string,
  contentType: string,
): Promise<StoredMedia> {
  const ext = fileName.split(".").pop() || "bin";
  const key = `uploads/${folder}/${nanoid()}.${ext}`;
  await putBuffer(key, bytes, contentType);
  const publicBase = (process.env.S3_PUBLIC_BASE_URL || "").replace(/\/$/, "");
  const publicUrl = publicBase ? `${publicBase}/${key}` : key;
  return { key, publicUrl, byteSize: bytes.length, contentType, driver: "s3" };
}

async function storeOnSupabase(
  bytes: Buffer,
  folder: MediaFolder,
  fileName: string,
  contentType: string,
): Promise<StoredMedia> {
  await ensureUploadsBucket();
  const ext = fileName.split(".").pop() || "bin";
  const objectPath = `${folder}/${nanoid()}.${ext}`;
  const { error } = await adminDb.storage.from(UPLOADS_BUCKET).upload(objectPath, bytes, {
    contentType,
    upsert: true,
  });
  if (error) throw new Error(error.message);
  const { data: pub } = adminDb.storage.from(UPLOADS_BUCKET).getPublicUrl(objectPath);
  return {
    key: `storage:${UPLOADS_BUCKET}/${objectPath}`,
    publicUrl: pub.publicUrl,
    byteSize: bytes.length,
    contentType,
    driver: "supabase",
  };
}

/**
 * Preferred order: Hostinger shared hosting → S3 (when launched) → Supabase Storage.
 */
export async function storeMediaFile(input: {
  bytes: Buffer;
  folder: MediaFolder;
  fileName: string;
  contentType?: string;
}): Promise<StoredMedia> {
  const contentType = input.contentType || "application/octet-stream";
  if (hostingerConfigured()) {
    return storeOnHostinger(input.bytes, input.folder, input.fileName, contentType);
  }
  if (s3Configured()) {
    return storeOnS3(input.bytes, input.folder, input.fileName, contentType);
  }
  return storeOnSupabase(input.bytes, input.folder, input.fileName, contentType);
}

export function resolveMediaUrl(key: string, publicUrl?: string | null) {
  if (publicUrl && /^https?:\/\//i.test(publicUrl)) return publicUrl;
  if (/^https?:\/\//i.test(key)) return key;
  const base = mediaPublicBase();
  if (base && key.startsWith("media/")) return `${base.replace(/\/media$/, "")}/${key}`;
  if (base) return `${base}/${key.replace(/^media\//, "")}`;
  return null;
}
