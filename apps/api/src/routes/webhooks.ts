import { Hono } from "hono";
import type Stripe from "stripe";
import { stripe } from "../lib/stripe.js";
import { adminDb } from "../lib/db.js";
import { ensureInvoiceForOrder } from "../lib/access.js";
import { pdfQueue } from "../lib/queue.js";
import { sendMail } from "../lib/mail.js";
import { urls } from "../lib/auth.js";
import { periodEndIso, rememberPeriodEnd } from "../lib/billing.js";

export const webhooks = new Hono();

webhooks.post("/stripe", async (c) => {
  const signature = c.req.header("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !secret) return c.json({ error: "Webhook misconfigured" }, 400);
  const raw = await c.req.text();
  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(raw, signature, secret);
  } catch (err) {
    return c.json({ error: (err as Error).message }, 400);
  }

  if (event.type === "checkout.session.completed") {
    await fulfillCheckoutSession(event.data.object as Stripe.Checkout.Session);
  }
  if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
    await onSubscription(event.data.object as Stripe.Subscription);
  }
  return c.json({ received: true });
});

/** Apply paid checkout (webhook or success-page confirm). Idempotent. */
export async function fulfillCheckoutSession(session: Stripe.Checkout.Session) {
  if (session.payment_status !== "paid" && session.status !== "complete") {
    return { ok: false as const, reason: "not_paid" };
  }

  const kind = session.metadata?.kind;
  const { data: order } = await adminDb
    .from("orders")
    .update({
      status: "paid",
      stripe_payment_intent_id: typeof session.payment_intent === "string" ? session.payment_intent : null,
      amount_cents: session.amount_total ?? 0,
      currency: session.currency ?? "usd",
    })
    .eq("stripe_checkout_session_id", session.id)
    .select("*")
    .maybeSingle();

  if (
    (kind === "course" || kind === "cart") &&
    session.metadata?.userId &&
    (session.metadata.courseIds || session.metadata.courseId)
  ) {
    const ids = (session.metadata.courseIds || session.metadata.courseId || "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);
    for (const courseId of ids) {
      await adminDb.from("enrollments").upsert(
        { user_id: session.metadata.userId, course_id: courseId, source: "purchase" },
        { onConflict: "user_id,course_id" },
      );
    }
  }

  if (kind === "seats" && session.metadata?.organizationId) {
    const seats = Number(session.metadata.seats || 0);
    await adminDb
      .from("organizations")
      .update({
        seat_limit: seats,
        status: "active",
        stripe_customer_id: typeof session.customer === "string" ? session.customer : null,
        stripe_subscription_id: typeof session.subscription === "string" ? session.subscription : null,
      })
      .eq("id", session.metadata.organizationId);
    if (typeof session.subscription === "string") {
      try {
        const sub = await stripe().subscriptions.retrieve(session.subscription);
        await rememberPeriodEnd(session.metadata.organizationId, periodEndIso(sub));
      } catch {
        /* period end shows after the next subscription event */
      }
    }
  }

  if (order) {
    await ensureInvoiceForOrder(order);
    try {
      await pdfQueue().add("invoice", { kind: "invoice", orderId: order.id });
    } catch {
      /* redis optional locally */
    }
    const email = session.customer_details?.email || session.customer_email;
    if (email) {
      try {
        await sendMail({
          to: email,
          subject: "Your WORKIZ receipt",
          html: `<p>Thanks for your purchase.</p><p>Open your learning space: <a href="${urls().learn}">${urls().learn}</a></p>`,
        });
      } catch {
        /* mail optional locally */
      }
    }
  }

  return { ok: true as const, kind: kind ?? null, orderId: order?.id ?? null };
}

async function onSubscription(sub: Stripe.Subscription) {
  const orgId = sub.metadata?.organizationId;
  if (!orgId) return;
  const quantity = sub.items.data[0]?.quantity ?? 0;
  const status =
    sub.status === "active" || sub.status === "trialing"
      ? "active"
      : sub.status === "past_due"
        ? "past_due"
        : "canceled";
  await adminDb
    .from("organizations")
    .update({
      seat_limit: quantity,
      status,
      stripe_subscription_id: sub.id,
    })
    .eq("id", orgId);
  await rememberPeriodEnd(orgId, periodEndIso(sub));
}
