import { cookies } from "next/headers";
import { createServerSupabase } from "@workix/db/server";

export async function getSessionUser() {
  const cookieStore = await cookies();
  const supabase = createServerSupabase(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, profile: null };
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  return { supabase, user, profile };
}

export function publicApi() {
  const url = process.env.API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
  return url.replace("://api.localhost", "://localhost");
}
