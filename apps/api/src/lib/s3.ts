import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

function required(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env ${name}`);
  return value;
}

/** True when S3/R2 credentials are present (videos + private files). */
export function s3Configured() {
  return Boolean(process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY && process.env.S3_BUCKET);
}

export function s3() {
  return new S3Client({
    region: process.env.S3_REGION || "auto",
    endpoint: process.env.S3_ENDPOINT || undefined,
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
    credentials: {
      accessKeyId: required("S3_ACCESS_KEY_ID"),
      secretAccessKey: required("S3_SECRET_ACCESS_KEY"),
    },
  });
}

export function bucket() {
  return required("S3_BUCKET");
}

export async function presignPut(key: string, contentType: string, expiresIn = 3600) {
  if (!s3Configured()) {
    throw new Error("S3 is not configured. Set S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, and S3_BUCKET.");
  }
  const command = new PutObjectCommand({
    Bucket: bucket(),
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(s3(), command, { expiresIn });
}

export async function presignGet(key: string, expiresIn = 300) {
  const command = new GetObjectCommand({ Bucket: bucket(), Key: key });
  return getSignedUrl(s3(), command, { expiresIn });
}

export async function putBuffer(key: string, body: Buffer, contentType: string) {
  await s3().send(
    new PutObjectCommand({
      Bucket: bucket(),
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
}

export async function getObjectBuffer(key: string) {
  const res = await s3().send(new GetObjectCommand({ Bucket: bucket(), Key: key }));
  const bytes = await res.Body?.transformToByteArray();
  return Buffer.from(bytes ?? []);
}
