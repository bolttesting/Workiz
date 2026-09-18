import { Hono } from "hono";
import { z } from "zod";
import { stripe } from "../lib/stripe.js";
import { adminDb } from "../lib/db.js";
import { urls, type Authed } from "../lib/auth.js";

export const checkout = new Hono<{ Variables: { auth: Authed } }>();

checkout.post("/course", async (c) => {
  const auth = c.get("auth");
  const { courseId } = z.object({ courseId: z.string().uuid() }).parse(await c.req.json());
  const { data: course } = await adminDb.from("courses").select("*").eq("id", courseId).single();
  if (!course || !course.published) return c.json({ error: "Course unavailable" }, 404);

  const { data: existing } = await adminDb
    .from("enrollments")
    .select("id")
    .eq("user_id", auth.userId)
    .eq("course_id", courseId)
    .maybeSingle();
  if (existing) return c.json({ error: "Already enrolled", learnUrl: `${urls().learn}/courses/${course.slug}` }, 409);

  const session = await stripe().checkout.sessions.create({
    mode: "payment",
    customer_email: auth.email,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: course.currency,
          unit_amount: course.price_cents,
          product_data: { name: course.title, description: course.subtitle ?? undefined },
        },
      },
    ],
    success_url: `${urls().learn}/courses/${course.slug}?purchased=1`,
    cancel_url: `${urls().web}/courses/${course.slug}`,
    metadata: {
      kind: "course",
      userId: auth.userId,
      courseId: course.id,
    },
  });

  await adminDb.from("orders").insert({
    user_id: auth.userId,
    kind: "course",
    course_id: course.id,
    amount_cents: course.price_cents,
    currency: course.currency,
    status: "pending",
    stripe_checkout_session_id: session.id,
  });

  return c.json({ url: session.url });
});

checkout.post("/seats", async (c) => {
  const auth = c.get("auth");
  const body = z
    .object({
      companyName: z.string().min(2),
      seats: z.number().int().min(1).max(500),
      billingEmail: z.string().email().optional(),
    })
    .parse(await c.req.json());

  const priceId = process.env.STRIPE_SEAT_PRICE_ID;
  if (!priceId) return c.json({ error: "Seat price is not configured" }, 500);

  let orgId = auth.profile.organization_id;
  if (!orgId) {
    const { data: org, error } = await adminDb
      .from("organizations")
      .insert({
        name: body.companyName,
        billing_email: body.billingEmail ?? auth.email,
        seat_limit: 0,
        status: "incomplete",
      })
      .select("id")
      .single();
    if (error || !org) return c.json({ error: error?.message ?? "Could not create company" }, 400);
    orgId = org.id;
    await adminDb
      .from("profiles")
      .update({ organization_id: orgId, role: "company_admin" })
      .eq("id", auth.userId);
  }

  const session = await stripe().checkout.sessions.create({
    mode: "subscription",
    customer_email: body.billingEmail ?? auth.email,
    line_items: [{ price: priceId, quantity: body.seats }],
    success_url: `${urls().learn}/team?subscribed=1`,
    cancel_url: `${urls().web}/pricing`,
    metadata: {
      kind: "seats",
      userId: auth.userId,
      organizationId: orgId,
      seats: String(body.seats),
    },
    subscription_data: {
      metadata: { organizationId: orgId },
    },
  });

  await adminDb.from("orders").insert({
    user_id: auth.userId,
    organization_id: orgId,
    kind: "seats",
    seat_quantity: body.seats,
    amount_cents: 0,
    currency: "usd",
    status: "pending",
    stripe_checkout_session_id: session.id,
  });

  return c.json({ url: session.url });
});
