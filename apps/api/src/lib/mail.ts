import { Resend } from "resend";

export function resend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("Missing RESEND_API_KEY");
  return new Resend(key);
}

export function fromAddress() {
  return process.env.EMAIL_FROM || "WORKIZ <hello@workiz.com>";
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderEmail(opts: {
  preview: string;
  title: string;
  paragraphs: string[];
  action?: { label: string; href: string };
  note?: string;
}) {
  const preview = escapeHtml(opts.preview);
  const title = escapeHtml(opts.title);
  const paragraphs = opts.paragraphs
    .map(
      (paragraph) =>
        `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#1a2430;">${escapeHtml(paragraph)}</p>`,
    )
    .join("");
  const action = opts.action
    ? `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:8px 0 4px;">
        <tr>
          <td style="border-radius:8px;background:#102846;">
            <a href="${escapeHtml(opts.action.href)}" style="display:inline-block;padding:12px 22px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">${escapeHtml(opts.action.label)}</a>
          </td>
        </tr>
      </table>`
    : "";
  const note = opts.note
    ? `<p style="margin:18px 0 0;font-size:13px;line-height:1.5;color:#5c6b7a;">${escapeHtml(opts.note)}</p>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
  <body style="margin:0;padding:0;background:#f4f7fb;">
    <div style="display:none;max-height:0;overflow:hidden;">${preview}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f7fb;">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;">
            <tr>
              <td style="padding:22px 28px;background:#102846;">
                <div style="font-family:Georgia,serif;font-size:18px;letter-spacing:0.14em;color:#ffffff;">WORKIZ</div>
                <div style="margin-top:8px;height:2px;width:42px;background:#b69856;"></div>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 28px 8px;font-family:Arial,Helvetica,sans-serif;">
                <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;font-weight:600;color:#102846;">${title}</h1>
                ${paragraphs}
                ${action}
                ${note}
              </td>
            </tr>
            <tr>
              <td style="padding:8px 28px 24px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:#6b7280;">
                Workiz Support Solutions - FZCO, Dubai
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function inviteEmail(opts: { inviter: string; company: string; link: string }) {
  return renderEmail({
    preview: `${opts.inviter} invited you to ${opts.company} on WORKIZ.`,
    title: `Join ${opts.company}`,
    paragraphs: [
      `${opts.inviter} invited you to learn with ${opts.company} on WORKIZ.`,
      "The button signs you in with this email address. The courses assigned to you will be waiting.",
    ],
    action: { label: "Accept invite", href: opts.link },
    note: "If you were not expecting this, you can ignore the message.",
  });
}

export function receiptEmail(opts: { learnUrl: string; kind?: "course" | "seats" }) {
  const seats = opts.kind === "seats";
  return renderEmail({
    preview: seats
      ? "Your company package payment was received."
      : "Thanks for your purchase. Your course is ready.",
    title: seats ? "Your package payment was received" : "Thanks for your purchase",
    paragraphs: seats
      ? [
          "The monthly payment for your company package was received.",
          "Open WORKIZ to invite people and assign courses.",
        ]
      : ["Your payment was received.", "Open WORKIZ to start the course. A receipt is in your invoices."],
    action: { label: seats ? "Open company space" : "Start learning", href: opts.learnUrl },
  });
}

export function emailAmount(cents: number) {
  const amount = (Number(cents) || 0) / 100;
  return `${amount.toLocaleString("en-AE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Dirham`;
}

export function invoiceEmail(opts: { number: string; amount: string; href: string }) {
  return renderEmail({
    preview: `Invoice ${opts.number} is ready.`,
    title: `Invoice ${opts.number}`,
    paragraphs: [`Your invoice is ready.`, `Amount ${opts.amount}.`, "Download the PDF from your account."],
    action: { label: "View invoices", href: opts.href },
  });
}

export function learnerReminderEmail(opts: { course: string; dueAt: string; overdue: boolean; href: string }) {
  return renderEmail({
    preview: opts.overdue ? `${opts.course} was due on ${opts.dueAt}.` : `${opts.course} is due on ${opts.dueAt}.`,
    title: opts.overdue ? `${opts.course} is overdue` : `${opts.course} is due soon`,
    paragraphs: opts.overdue
      ? [`${opts.course} was due on ${opts.dueAt}.`, "Open the course and finish the remaining lessons."]
      : [`${opts.course} is due on ${opts.dueAt}.`, "Open the course and finish it before that date."],
    action: { label: "Open course", href: opts.href },
  });
}

export function adminReminderEmail(opts: { company: string; lines: string[]; href: string }) {
  return renderEmail({
    preview: `Training dates for ${opts.company}.`,
    title: "Training dates",
    paragraphs: [`People at ${opts.company} have courses that are due soon or overdue.`, ...opts.lines],
    action: { label: "Open team", href: opts.href },
  });
}

export function certificateEmail(opts: { course: string; href: string }) {
  return renderEmail({
    preview: `Your certificate for ${opts.course} is ready.`,
    title: "Your certificate is ready",
    paragraphs: [`You completed ${opts.course}.`, "Download the PDF from your certificates."],
    action: { label: "View certificate", href: opts.href },
  });
}

export async function sendMail(opts: { to: string; subject: string; html: string }) {
  if (!process.env.RESEND_API_KEY?.trim()) {
    console.warn("[email:skip]", opts.subject, opts.to);
    return { sent: false as const, error: "Email is not configured, so nothing was sent." };
  }
  const { error } = await resend().emails.send({
    from: fromAddress(),
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
  });
  if (error) {
    console.error("[email:fail]", error.message);
    return { sent: false as const, error: error.message };
  }
  return { sent: true as const };
}
