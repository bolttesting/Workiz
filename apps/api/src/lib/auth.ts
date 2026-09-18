import type { Context, Next } from "hono";
import { adminDb } from "./db.js";
import type { Profile, UserRole } from "@workix/db/types";

export type Authed = {
  userId: string;
  email: string;
  profile: Profile;
};

export async function getBearer(c: Context) {
  const header = c.req.header("Authorization");
  if (header?.startsWith("Bearer ")) return header.slice(7);
  return null;
}

export async function requireUser(c: Context, next: Next) {
  const token = await getBearer(c);
  if (!token) return c.json({ error: "Unauthorized" }, 401);
  const { data, error } = await adminDb.auth.getUser(token);
  if (error || !data.user) return c.json({ error: "Unauthorized" }, 401);
  const { data: profile } = await adminDb.from("profiles").select("*").eq("id", data.user.id).single();
  if (!profile) return c.json({ error: "Profile missing" }, 403);
  c.set("auth", {
    userId: data.user.id,
    email: data.user.email ?? profile.email,
    profile: profile as Profile,
  } satisfies Authed);
  await next();
}

export function requireRole(...roles: UserRole[]) {
  return async (c: Context, next: Next) => {
    const auth = c.get("auth") as Authed | undefined;
    if (!auth) return c.json({ error: "Unauthorized" }, 401);
    if (!roles.includes(auth.profile.role)) return c.json({ error: "Forbidden" }, 403);
    await next();
  };
}

export function urls() {
  return {
    web: process.env.NEXT_PUBLIC_WEB_URL ?? "http://localhost:3000",
    learn: process.env.NEXT_PUBLIC_LEARN_URL ?? "http://localhost:3001",
    admin: process.env.NEXT_PUBLIC_ADMIN_URL ?? "http://localhost:3002",
  };
}
