"use client";

import { useEffect, useState } from "react";
import { SEAT_PLANS } from "@workix/config";
import { SiteFooter, SiteHeader, Breadcrumb } from "@/components/SiteChrome";
import { PricingSection, type PricingPlan } from "@/components/ui/pricing";
import { buildSeatsSelection, useSeatsCart, type SeatPlanSnapshot } from "@/lib/seats-cart";

type RemotePlan = SeatPlanSnapshot & {
  blurb: string;
  popular: boolean;
  features: string[];
};

const PLAN_FEATURES: Record<string, string[]> = {
  growth: [
    "100 learner seats",
    "Multi-department admin tools",
    "Priority course assignment",
    "Progress dashboards",
    "Priority support",
  ],
  custom: [
    "__SEATS__ learner seats",
    "Everything in Growth",
    "Dedicated onboarding help",
    "Custom training rollout support",
    "Account manager",
  ],
};

function fallbackPlans(): RemotePlan[] {
  return SEAT_PLANS.map((plan) => ({
    id: plan.id,
    name: plan.name,
    blurb: plan.blurb,
    seats: plan.seats,
    monthlyCents: plan.monthlyCents,
    custom: plan.custom,
    pricePerSeatCents: "pricePerSeatCents" in plan ? plan.pricePerSeatCents : null,
    minSeats: "minSeats" in plan ? plan.minSeats : null,
    maxSeats: "maxSeats" in plan ? plan.maxSeats : null,
    popular: plan.id === "growth",
    features: PLAN_FEATURES[plan.id] ?? [plan.blurb],
  }));
}

function toPlans(source: RemotePlan[]): PricingPlan[] {
  return source.map((plan) => {
    const features = plan.features?.length ? plan.features : (PLAN_FEATURES[plan.id] ?? [plan.blurb]);
    if (plan.custom) {
      const perSeat = (plan.pricePerSeatCents ?? 0) / 100;
      const defaultSeats = plan.seats;
      return {
        name: plan.name,
        price: String(defaultSeats * perSeat),
        yearlyPrice: String(Math.round(defaultSeats * perSeat * 0.8)),
        period: "month",
        features,
        description: plan.blurb,
        buttonText: "Choose seats",
        href: "/cart?kind=seats",
        planId: plan.id,
        isCustom: true,
        pricePerSeatCents: plan.pricePerSeatCents ?? 0,
        minSeats: plan.minSeats ?? undefined,
        maxSeats: plan.maxSeats ?? undefined,
        defaultSeats,
        seats: defaultSeats,
      };
    }

    const monthly = Math.round(plan.monthlyCents / 100);
    const yearly = Math.round(monthly * 0.8);
    return {
      name: plan.name,
      price: String(monthly),
      yearlyPrice: String(yearly),
      period: "month",
      features,
      description: plan.blurb,
      buttonText: `Choose ${plan.seats} seats`,
      href: "/cart?kind=seats",
      isPopular: plan.popular || plan.id === "growth",
      seats: plan.seats,
      planId: plan.id,
    };
  });
}

export default function PricingPage() {
  const { setSelection } = useSeatsCart();
  const [source, setSource] = useState<RemotePlan[]>(() => fallbackPlans());

  useEffect(() => {
    const api = process.env.NEXT_PUBLIC_API_URL;
    if (!api) return;
    fetch(`${api}/plans`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json: { plans?: RemotePlan[] } | null) => {
        if (json?.plans?.length) setSource(json.plans);
      })
      .catch(() => undefined);
  }, []);

  const plans = toPlans(source);

  function selectPlan(plan: PricingPlan, seats?: number) {
    const match = source.find((row) => row.id === plan.planId);
    if (!match) return;
    const selection = buildSeatsSelection({
      plan: match,
      seats: seats ?? match.seats,
    });
    if (!selection) return;
    setSelection(selection);
  }

  return (
    <>
      <SiteHeader />
      <Breadcrumb title="Companies" crumb="Companies" />

      <PricingSection
        plans={plans}
        title="Company seat packages"
        description={"Contract seats for your workforce.\nAdmins create accounts and assign courses by department."}
        onSelectPlan={selectPlan}
      />

      <SiteFooter />
    </>
  );
}
