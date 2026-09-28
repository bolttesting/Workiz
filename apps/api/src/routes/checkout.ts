import { Hono } from "hono";
import { z } from "zod";
import { stripe } from "../lib/stripe.js";
import { adminDb } from "../lib/db.js";
import { urls, type Authed } from "../lib/auth.js";
import { listSeatPlans } from "../lib/plans.js";
import { fulfillCheckoutSession } from "./webhooks.js";

export const checkout = new Hono<{ Variables: { auth: Authed } }>();

/**
 * Local / no-webhook fallback: after Stripe redirects back, the app confirms
 * the session with the Secret key and fulfills enrollments/seats.
 */
checkout.post("/confirm", async (c) => {
  const auth = c.get("auth");
  const { sessionId } = z.object({ sessionId: z.string().min(10) }).parse(await c.req.json());
  const session = await stripe().checkout.sessions.retrieve(sessionId);
  if (session.metadata?.userId && session.metadata.userId !== auth.userId && auth.profile.role !== "super_admin") {
    return c.json({ error: "Forbidden" }, 403);
  }
  const result = await fulfillCheckoutSession(session);
  if (!result.ok) return c.json({ error: "Payment not complete yet", ...result }, 402);
  return c.json(result);
});

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
          currency: "aed",
          unit_amount: course.price_cents,
          product_data: { name: course.title, description: course.subtitle ?? undefined },
        },
      },
    ],
    success_url: `${urls().learn}/courses/${course.slug}?purchased=1&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${urls().web}/courses/${course.slug}`,
    metadata: {
      kind: "course",
      userId: auth.userId,
      courseId: course.id,
      courseIds: course.id,
    },
  });

  await adminDb.from("orders").insert({
    user_id: auth.userId,
    kind: "course",
    course_id: course.id,
    amount_cents: course.price_cents,
    currency: "aed",
    status: "pending",
    stripe_checkout_session_id: session.id,
  });

  return c.json({ url: session.url });
});

checkout.post("/cart", async (c) => {
  const auth = c.get("auth");
  const { courseIds } = z
    .object({ courseIds: z.array(z.string().uuid()).min(1).max(20) })
    .parse(await c.req.json());

  const uniqueIds = Array.from(new Set(courseIds));
  const { data: courses } = await adminDb
    .from("courses")
    .select("*")
    .in("id", uniqueIds)
    .eq("published", true);

  if (!courses?.length) return c.json({ error: "No purchasable courses in cart" }, 404);

  const { data: enrolled } = await adminDb
    .from("enrollments")
    .select("course_id")
    .eq("user_id", auth.userId)
    .in(
      "course_id",
      courses.map((row) => row.id),
    );

  const enrolledSet = new Set((enrolled ?? []).map((row) => row.course_id));
  const purchasable = courses.filter((row) => !enrolledSet.has(row.id));
  if (!purchasable.length) {
    return c.json({ error: "You are already enrolled in these courses", learnUrl: urls().learn }, 409);
  }

  const amount = purchasable.reduce((sum, row) => sum + row.price_cents, 0);
  const ids = purchasable.map((row) => row.id);

  const session = await stripe().checkout.sessions.create({
    mode: "payment",
    customer_email: auth.email,
    line_items: purchasable.map((course) => ({
      quantity: 1,
      price_data: {
        currency: "aed",
        unit_amount: course.price_cents,
        product_data: { name: course.title, description: course.subtitle ?? undefined },
      },
    })),
    success_url: `${urls().learn}?purchased=1&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${urls().web}/cart`,
    metadata: {
      kind: "cart",
      userId: auth.userId,
      courseId: ids[0] ?? "",
      courseIds: ids.join(","),
    },
  });

  await adminDb.from("orders").insert({
    user_id: auth.userId,
    kind: "course",
    course_id: ids[0],
    amount_cents: amount,
    currency: "aed",
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
      seats: z.number().int().min(1).max(10000),
      planId: z.string().min(1).optional(),
      billingEmail: z.string().email().optional(),
    })
    .parse(await c.req.json());

  const plans = await listSeatPlans();
  const plan = plans.find((row) => row.id === body.planId) ?? plans[0];
  if (!plan) return c.json({ error: "No company package is available" }, 400);

  let seats = body.seats;
  let amountCents = plan.monthlyCents;
  let unitAmount = plan.monthlyCents;
  let quantity = 1;
  if (plan.custom) {
    const min = plan.minSeats ?? 1;
    const max = plan.maxSeats ?? 10000;
    seats = Math.max(min, Math.min(max, seats));
    const perSeat = plan.pricePerSeatCents ?? Math.round(plan.monthlyCents / Math.max(plan.seats, 1));
    unitAmount = perSeat;
    quantity = seats;
    amountCents = perSeat * seats;
  } else {
    seats = plan.seats;
    unitAmount = plan.monthlyCents;
    quantity = 1;
    amountCents = plan.monthlyCents;
  }

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
    line_items: [
      {
        quantity,
        price_data: {
          currency: "aed",
          unit_amount: unitAmount,
          recurring: { interval: "month" },
          product_data: { name: `${plan.name} — ${seats} seats` },
        },
      },
    ],
    success_url: `${urls().learn}/team?subscribed=1&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${urls().web}/pricing`,
    metadata: {
      kind: "seats",
      userId: auth.userId,
      organizationId: orgId,
      seats: String(seats),
      planId: plan.id,
    },
    subscription_data: {
      metadata: { organizationId: orgId },
    },
  });

  await adminDb.from("orders").insert({
    user_id: auth.userId,
    organization_id: orgId,
    kind: "seats",
    seat_quantity: seats,
    amount_cents: amountCents,
    currency: "aed",
    status: "pending",
    stripe_checkout_session_id: session.id,
  });

  return c.json({ url: session.url });
});
