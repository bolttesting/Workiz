import { Hono } from "hono";
import { z } from "zod";
import { nanoid } from "nanoid";
import { adminDb } from "../lib/db.js";
import { sendMail } from "../lib/mail.js";
import { urls, type Authed } from "../lib/auth.js";

export const orgs = new Hono<{ Variables: { auth: Authed } }>();

orgs.get("/me", async (c) => {
  const auth = c.get("auth");
  if (!auth.profile.organization_id) return c.json({ organization: null, members: [], invites: [] });
  const { data: organization } = await adminDb
    .from("organizations")
    .select("*")
    .eq("id", auth.profile.organization_id)
    .single();
  const { data: members } = await adminDb
    .from("profiles")
    .select("id, email, full_name, role, created_at")
    .eq("organization_id", auth.profile.organization_id);
  const { data: invites } = await adminDb
    .from("invites")
    .select("*")
    .eq("organization_id", auth.profile.organization_id)
    .order("created_at", { ascending: false });
  return c.json({ organization, members: members ?? [], invites: invites ?? [] });
});

orgs.post("/invites", async (c) => {
  const auth = c.get("auth");
  if (auth.profile.role !== "company_admin" && auth.profile.role !== "super_admin") {
    return c.json({ error: "Forbidden" }, 403);
  }
  if (!auth.profile.organization_id) return c.json({ error: "No company" }, 400);
  const { email, role } = z
    .object({ email: z.string().email(), role: z.enum(["company_admin", "company_learner"]).default("company_learner") })
    .parse(await c.req.json());

  const { data: org } = await adminDb
    .from("organizations")
    .select("*")
    .eq("id", auth.profile.organization_id)
    .single();
  if (!org || org.status !== "active") return c.json({ error: "Company billing is not active" }, 400);
  if (org.seat_used >= org.seat_limit) return c.json({ error: "No seats left" }, 409);

  const token = nanoid(32);
  const expires = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString();
  const { data: invite, error } = await adminDb
    .from("invites")
    .insert({
      organization_id: org.id,
      email: email.toLowerCase(),
      token,
      role,
      invited_by: auth.userId,
      expires_at: expires,
    })
    .select("*")
    .single();
  if (error) return c.json({ error: error.message }, 400);

  const link = `${urls().web}/invite/${token}`;
  await sendMail({
    to: email,
    subject: `Join ${org.name} on WORKIZ`,
    html: `<p>${auth.profile.full_name || auth.email} invited you to learn on WORKIZ.</p><p><a href="${link}">Accept invite</a></p>`,
  });
  return c.json({ invite, link });
});

orgs.post("/invites/:token/accept", async (c) => {
  const auth = c.get("auth");
  const token = c.req.param("token");
  const { data: invite } = await adminDb.from("invites").select("*").eq("token", token).maybeSingle();
  if (!invite || invite.status !== "pending") return c.json({ error: "Invite invalid" }, 400);
  if (new Date(invite.expires_at).getTime() < Date.now()) {
    await adminDb.from("invites").update({ status: "expired" }).eq("id", invite.id);
    return c.json({ error: "Invite expired" }, 400);
  }
  if (invite.email.toLowerCase() !== auth.email.toLowerCase()) {
    return c.json({ error: "Sign in with the invited email" }, 403);
  }

  const { data: org } = await adminDb.from("organizations").select("*").eq("id", invite.organization_id).single();
  if (!org || org.seat_used >= org.seat_limit) return c.json({ error: "No seats left" }, 409);

  await adminDb
    .from("profiles")
    .update({ organization_id: org.id, role: invite.role })
    .eq("id", auth.userId);
  await adminDb
    .from("organizations")
    .update({ seat_used: org.seat_used + 1 })
    .eq("id", org.id);
  await adminDb
    .from("invites")
    .update({ status: "accepted", consumed_at: new Date().toISOString() })
    .eq("id", invite.id);

  return c.json({ ok: true, learnUrl: urls().learn });
});

orgs.delete("/members/:id", async (c) => {
  const auth = c.get("auth");
  if (auth.profile.role !== "company_admin") return c.json({ error: "Forbidden" }, 403);
  const memberId = c.req.param("id");
  if (memberId === auth.userId) return c.json({ error: "You cannot remove yourself" }, 400);
  const { data: member } = await adminDb.from("profiles").select("*").eq("id", memberId).single();
  if (!member || member.organization_id !== auth.profile.organization_id) {
    return c.json({ error: "Not found" }, 404);
  }
  await adminDb
    .from("profiles")
    .update({ organization_id: null, role: "individual_learner" })
    .eq("id", memberId);
  if (auth.profile.organization_id) {
    const { data: org } = await adminDb
      .from("organizations")
      .select("seat_used")
      .eq("id", auth.profile.organization_id)
      .single();
    if (org) {
      await adminDb
        .from("organizations")
        .update({ seat_used: Math.max(0, org.seat_used - 1) })
        .eq("id", auth.profile.organization_id);
    }
  }
  return c.json({ ok: true });
});
