import type Stripe from "stripe";
import { adminDb } from "./db.js";
import { stripe } from "./stripe.js";

type OrgRow = {
  id: string;
  stripe_subscription_id: string | null;
  current_period_end?: string | null;
  status: string;
};

export function periodEndIso(sub: Stripe.Subscription) {
  const legacy = sub as Stripe.Subscription & { current_period_end?: number };
  const item = sub.items?.data?.[0] as { current_period_end?: number } | undefined;
  const unix = legacy.current_period_end ?? item?.current_period_end;
  return unix ? new Date(unix * 1000).toISOString() : null;
}

export async function rememberPeriodEnd(orgId: string, periodEnd: string | null) {
  if (!periodEnd) return false;
  const { error } = await adminDb.from("organizations").update({ current_period_end: periodEnd }).eq("id", orgId);
  if (error && /current_period_end/i.test(error.message)) return false;
  return !error;
}

export type CompanyInvoice = {
  id: string;
  number: string;
  amountCents: number;
  currency: string;
  issuedAt: string | null;
};

export type CompanyBilling = {
  companyName: string;
  seats: number;
  seatsUsed: number;
  status: string;
  monthlyCents: number | null;
  renewsAt: string | null;
  cancelAtPeriodEnd: boolean;
  hasSubscription: boolean;
  invoices: CompanyInvoice[];
};

export async function loadCompanyBilling(orgId: string): Promise<CompanyBilling | null> {
  const { data: org } = await adminDb
    .from("organizations")
    .select("id, name, seat_limit, seat_used, status, stripe_subscription_id, current_period_end")
    .eq("id", orgId)
    .maybeSingle();
  if (!org) return null;

  let monthlyCents: number | null = null;
  let renewsAt = org.current_period_end ? String(org.current_period_end) : null;
  let cancelAtPeriodEnd = false;
  let status = String(org.status);

  if (org.stripe_subscription_id && process.env.STRIPE_SECRET_KEY) {
    try {
      const sub = await stripe().subscriptions.retrieve(org.stripe_subscription_id);
      const item = sub.items.data[0];
      const unit = item?.price?.unit_amount ?? 0;
      const quantity = item?.quantity ?? 1;
      monthlyCents = unit * quantity;
      renewsAt = periodEndIso(sub) ?? renewsAt;
      cancelAtPeriodEnd = Boolean(sub.cancel_at_period_end);
      if (renewsAt) await rememberPeriodEnd(org.id, renewsAt);
      status =
        sub.status === "active" || sub.status === "trialing"
          ? "active"
          : sub.status === "past_due"
            ? "past_due"
            : "canceled";
    } catch {
      /* keep the saved company record if Stripe is briefly unavailable */
    }
  }

  const { data: orders } = await adminDb
    .from("orders")
    .select("id")
    .eq("organization_id", orgId)
    .eq("status", "paid");
  const orderIds = (orders ?? []).map((order) => order.id);
  const { data: invoices } = orderIds.length
    ? await adminDb
        .from("invoices")
        .select("id, number, amount_cents, currency, issued_at")
        .in("order_id", orderIds)
    : { data: [] as { id: string; number: string; amount_cents: number; currency: string; issued_at: string | null }[] };

  return {
    companyName: org.name,
    seats: org.seat_limit,
    seatsUsed: org.seat_used,
    status,
    monthlyCents,
    renewsAt,
    cancelAtPeriodEnd,
    hasSubscription: Boolean(org.stripe_subscription_id),
    invoices: (invoices ?? [])
      .map((invoice) => ({
        id: invoice.id,
        number: invoice.number,
        amountCents: invoice.amount_cents,
        currency: invoice.currency,
        issuedAt: invoice.issued_at,
      }))
      .sort((a, b) => (b.issuedAt ?? "").localeCompare(a.issuedAt ?? "")),
  };
}

export async function scheduleCompanyCancel(orgId: string) {
  const { data: org } = await adminDb
    .from("organizations")
    .select("id, stripe_subscription_id")
    .eq("id", orgId)
    .maybeSingle();
  if (!org?.stripe_subscription_id) {
    throw new Error("This package is not on a monthly card payment.");
  }
  if (!process.env.STRIPE_SECRET_KEY) throw new Error("Card payments are not configured.");
  const sub = await stripe().subscriptions.update(org.stripe_subscription_id, { cancel_at_period_end: true });
  await rememberPeriodEnd(orgId, periodEndIso(sub));
  return loadCompanyBilling(orgId);
}

export async function enrichOrganizationBilling<T extends OrgRow>(orgs: T[]) {
  if (!process.env.STRIPE_SECRET_KEY) return orgs;
  const client = stripe();
  return Promise.all(
    orgs.map(async (org) => {
      if (!org.stripe_subscription_id) return org;
      try {
        const sub = await client.subscriptions.retrieve(org.stripe_subscription_id);
        const periodEnd = periodEndIso(sub);
        if (periodEnd && periodEnd !== org.current_period_end) await rememberPeriodEnd(org.id, periodEnd);
        return {
          ...org,
          current_period_end: periodEnd ?? org.current_period_end ?? null,
          subscription_status: sub.status,
        };
      } catch {
        return org;
      }
    }),
  );
}
