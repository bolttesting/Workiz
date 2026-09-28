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
