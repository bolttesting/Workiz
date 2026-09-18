import { Hono } from "hono";
import type Stripe from "stripe";
import { stripe } from "../lib/stripe.js";
import { adminDb } from "../lib/db.js";
import { pdfQueue } from "../lib/queue.js";
import { sendMail } from "../lib/mail.js";
import { urls } from "../lib/auth.js";

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
    await onCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
  }
  if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
    await onSubscription(event.data.object as Stripe.Subscription);
  }
  return c.json({ received: true });
});

async function onCheckoutCompleted(session: Stripe.Checkout.Session) {
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

  if (kind === "course" && session.metadata?.userId && session.metadata.courseId) {
    await adminDb.from("enrollments").upsert(
      { user_id: session.metadata.userId, course_id: session.metadata.courseId, source: "purchase" },
      { onConflict: "user_id,course_id" },
    );
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
  }

  if (order) {
    await pdfQueue().add("invoice", { kind: "invoice", orderId: order.id });
    const email = session.customer_details?.email || session.customer_email;
    if (email) {
      await sendMail({
        to: email,
        subject: "Your WORKIZ receipt",
        html: `<p>Thanks for your purchase.</p><p>Open your learning space: <a href="${urls().learn}">${urls().learn}</a></p>`,
      });
    }
  }
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
}
