import { Hono } from "hono";
import { z } from "zod";
import { urls } from "../lib/auth.js";
import { adminDb } from "../lib/db.js";
import { confirmAccountEmail, resetPasswordEmail, sendMail } from "../lib/mail.js";

export const authMail = new Hono();

function confirmLink(tokenHash: string, type: "signup" | "recovery") {
  const url = new URL(`${urls().web}/sign-in`);
  url.searchParams.set("token_hash", tokenHash);
  url.searchParams.set("type", type);
  return url.toString();
}

authMail.post("/sign-up", async (c) => {
  const body = z
    .object({
      email: z.string().trim().email(),
      password: z.string().min(6).max(72),
      fullName: z.string().trim().max(120).optional(),
      companyName: z.string().trim().max(120).optional(),
      intendedRole: z.enum(["individual_learner", "company_admin"]).optional(),
    })
    .parse(await c.req.json());

  const generated = await adminDb.auth.admin.generateLink({
    type: "signup",
    email: body.email,
    password: body.password,
    options: {
      data: {
        full_name: body.fullName || "",
        ...(body.companyName ? { company_name: body.companyName } : {}),
        ...(body.intendedRole ? { intended_role: body.intendedRole } : {}),
      },
      redirectTo: `${urls().web}/sign-in`,
    },
  });
  const tokenHash = generated.data?.properties?.hashed_token;
  if (!tokenHash) {
    const message = generated.error?.message ?? "Could not create that account.";
    if (/already|registered|exists/i.test(message)) {
      return c.json({ error: "An account with that email already exists. Sign in instead." }, 400);
    }
    return c.json({ error: message }, 400);
  }

  const mail = await sendMail({
    to: body.email,
    subject: "Confirm your WORKIZ account",
    html: confirmAccountEmail({ href: confirmLink(tokenHash, "signup") }),
  });
  if (!mail.sent) return c.json({ error: mail.error }, 503);
  return c.json({ ok: true });
});

authMail.post("/forgot", async (c) => {
  const body = z.object({ email: z.string().trim().email() }).parse(await c.req.json());
  const generated = await adminDb.auth.admin.generateLink({
    type: "recovery",
    email: body.email,
    options: { redirectTo: `${urls().web}/sign-in` },
  });
  const tokenHash = generated.data?.properties?.hashed_token;
  if (tokenHash) {
    await sendMail({
      to: body.email,
      subject: "Reset your WORKIZ password",
      html: resetPasswordEmail({ href: confirmLink(tokenHash, "recovery") }),
    });
  }
  return c.json({ ok: true });
});
