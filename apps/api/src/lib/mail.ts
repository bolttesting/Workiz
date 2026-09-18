import { Resend } from "resend";

export function resend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("Missing RESEND_API_KEY");
  return new Resend(key);
}

export function fromAddress() {
  return process.env.EMAIL_FROM || "WORKIZ <hello@workiz.com>";
}

export async function sendMail(opts: { to: string; subject: string; html: string }) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[email:skip]", opts.subject, opts.to);
    return;
  }
  await resend().emails.send({
    from: fromAddress(),
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
  });
}
