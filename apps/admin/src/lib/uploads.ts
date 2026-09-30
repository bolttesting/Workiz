"use client";

import { createBrowserSupabase } from "@workix/db/browser";
import { apiClient } from "@/lib/api";

export async function uploadAdminAsset(
  file: File,
  folder: "courses" | "blog" | "lessons" | "misc" = "misc",
  onProgress?: (loaded: number, total: number) => void,
) {
  if (!onProgress) {
    const form = new FormData();
    form.append("file", file);
    form.append("folder", folder);
    const { publicUrl } = await apiClient<{ key: string; publicUrl: string }>("/admin/assets/upload", {
      method: "POST",
      body: form,
    });
    return publicUrl;
  }

  const supabase = createBrowserSupabase();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const form = new FormData();
  form.append("file", file);
  form.append("folder", folder);

  return new Promise<string>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${process.env.NEXT_PUBLIC_API_URL}/admin/assets/upload`);
    if (session?.access_token) xhr.setRequestHeader("Authorization", `Bearer ${session.access_token}`);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(event.loaded, event.total);
    };
    xhr.onload = () => {
      let json: { publicUrl?: string; error?: string } = {};
      try {
        json = JSON.parse(xhr.responseText || "{}");
      } catch {
        json = {};
      }
      if (xhr.status >= 200 && xhr.status < 300 && json.publicUrl) {
        onProgress(file.size, file.size);
        resolve(json.publicUrl);
        return;
      }
      reject(new Error(json.error || xhr.statusText || "Upload failed"));
    };
    xhr.onerror = () => reject(new Error("Upload failed. Check the connection and try again."));
    xhr.send(form);
  });
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
