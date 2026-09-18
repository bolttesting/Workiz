import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

function cookieDomain() {
  const domain = process.env.COOKIE_DOMAIN || process.env.NEXT_PUBLIC_COOKIE_DOMAIN || "";
  const trimmed = domain.trim();
  if (!trimmed || trimmed === "localhost" || trimmed === ".localhost") return undefined;
  return trimmed;
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: {
        domain: cookieDomain(),
        path: "/",
        sameSite: "lax",
      },
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options as never);
          });
        },
      },
    },
  );
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const web = process.env.NEXT_PUBLIC_WEB_URL ?? "http://localhost:3000";
  if (!user) return NextResponse.redirect(`${web}/sign-in`);
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "super_admin") {
    return NextResponse.redirect(process.env.NEXT_PUBLIC_LEARN_URL ?? "http://localhost:3001");
  }
  return response;
}

export const config = { matcher: ["/((?!_next/static|_next/image|assets|favicon.ico).*)"] };
