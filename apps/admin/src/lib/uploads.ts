"use client";

import { apiClient } from "@/lib/api";

export async function uploadAdminAsset(file: File, folder: "courses" | "blog" | "lessons" | "misc" = "misc") {
  const form = new FormData();
  form.append("file", file);
  form.append("folder", folder);
  const { publicUrl } = await apiClient<{ key: string; publicUrl: string }>("/admin/assets/upload", {
    method: "POST",
    body: form,
  });
  return publicUrl;
}

/** Presigned PUT flow (S3 or Supabase). Prefer uploadAdminAsset for images/PDFs. */
export async function uploadAdminAssetPresigned(
  file: File,
  folder: "courses" | "blog" | "lessons" | "misc" = "misc",
) {
  const { url, key, publicUrl } = await apiClient<{ url: string; key: string; publicUrl: string }>(
    "/admin/assets/upload-url",
    {
      method: "POST",
      body: JSON.stringify({
        contentType: file.type || "application/octet-stream",
        fileName: file.name,
        folder,
      }),
    },
  );
  await fetch(url, {
    method: "PUT",
    body: file,
    headers: { "Content-Type": file.type || "application/octet-stream" },
  });
  return { key, publicUrl };
}

export function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** UI enters dollars/AED; API stores integer cents. */
export function centsFromMajor(amount: number) {
  if (!Number.isFinite(amount)) return 0;
  return Math.round(amount * 100);
}

export function majorFromCents(cents: number) {
  if (!Number.isFinite(cents)) return 0;
  return Math.round(cents) / 100;
}

export const COURSE_CURRENCIES = [
  { value: "usd", label: "USD ($)" },
  { value: "aed", label: "AED" },
] as const;
