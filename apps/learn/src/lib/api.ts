"use client";

import { createBrowserSupabase } from "@workix/db/browser";

export async function apiClient<T>(path: string, init: RequestInit = {}): Promise<T> {
  const supabase = createBrowserSupabase();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const headers = new Headers(init.headers);
  if (session?.access_token) headers.set("Authorization", `Bearer ${session.access_token}`);
  if (init.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${path}`, {
    ...init,
    headers,
    credentials: "include",
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || res.statusText);
  return json as T;
}

export async function downloadFile(path: string, filename: string) {
  const supabase = createBrowserSupabase();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const headers = new Headers();
  if (session?.access_token) headers.set("Authorization", `Bearer ${session.access_token}`);
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${path}`, {
    headers,
    credentials: "include",
  });
  if (!res.ok) {
    const json = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(json.error || res.statusText);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
