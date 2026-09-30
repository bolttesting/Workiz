import { adminDb } from "./db.js";

/** Build a sign-in link for an invite without sending Supabase's own email. */
export async function inviteSignInLink(email: string, nextPath: string, web: string) {
  const redirectTo = `${web}${nextPath}`;
  const invited = await adminDb.auth.admin.generateLink({
    type: "invite",
    email,
    options: { redirectTo },
  });

  let properties = invited.data?.properties ?? null;
  let type: "invite" | "magiclink" = "invite";
  if (!properties?.hashed_token) {
    const exists = /already|registered|exists/i.test(invited.error?.message ?? "");
    if (!exists) return null;
    const magic = await adminDb.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: { redirectTo },
    });
    if (!magic.data?.properties?.hashed_token) return null;
    properties = magic.data.properties;
    type = "magiclink";
  }

  const tokenHash = properties.hashed_token;
  if (!tokenHash) return properties.action_link || null;
  const url = new URL(`${web}${nextPath}`);
  url.searchParams.set("token_hash", tokenHash);
  url.searchParams.set("type", type);
  return url.toString();
}
