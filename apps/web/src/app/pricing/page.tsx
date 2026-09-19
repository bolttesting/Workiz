"use client";

import { CUSTOM_SEAT_PRICE_CENTS, SEAT_PLANS } from "@workix/config";
import { SiteFooter, SiteHeader, Breadcrumb } from "@/components/SiteChrome";
import { PricingSection, type PricingPlan } from "@/components/ui/pricing";
import { buildSeatsSelection, useSeatsCart } from "@/lib/seats-cart";

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

function toPlans(): PricingPlan[] {
  return SEAT_PLANS.map((plan) => {
    if (plan.custom) {
      const perSeat = (plan.pricePerSeatCents ?? CUSTOM_SEAT_PRICE_CENTS) / 100;
      const defaultSeats = plan.seats;
      return {
        name: plan.name,
        price: String(defaultSeats * perSeat),
        yearlyPrice: String(Math.round(defaultSeats * perSeat * 0.8)),
        period: "month",
        features: PLAN_FEATURES[plan.id] ?? [plan.blurb],
        description: plan.blurb,
        buttonText: "Choose seats",
        href: "/cart?kind=seats",
        planId: plan.id,
        isCustom: true,
        pricePerSeatCents: plan.pricePerSeatCents ?? CUSTOM_SEAT_PRICE_CENTS,
        minSeats: plan.minSeats,
        maxSeats: plan.maxSeats,
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
      features: PLAN_FEATURES[plan.id] ?? [plan.blurb],
      description: plan.blurb,
      buttonText: `Choose ${plan.seats} seats`,
      href: "/cart?kind=seats",
      isPopular: plan.id === "growth",
      seats: plan.seats,
      planId: plan.id,
    };
  });
}

export default function PricingPage() {
  const { setSelection } = useSeatsCart();
  const plans = toPlans();

  function selectPlan(plan: PricingPlan, seats?: number) {
    if (!plan.planId) return;
    const selection = buildSeatsSelection({
      planId: plan.planId,
      seats: seats ?? plan.seats ?? plan.defaultSeats ?? 100,
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
