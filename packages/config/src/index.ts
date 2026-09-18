export const APP_NAME = "WORKIZ";

export const roles = [
  "super_admin",
  "instructor",
  "company_admin",
  "company_learner",
  "individual_learner",
] as const;

export type UserRole = (typeof roles)[number];

export function publicUrls() {
  return {
    web: process.env.NEXT_PUBLIC_WEB_URL ?? "http://localhost:3000",
    learn: process.env.NEXT_PUBLIC_LEARN_URL ?? "http://localhost:3001",
    admin: process.env.NEXT_PUBLIC_ADMIN_URL ?? "http://localhost:3002",
    api: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000",
  };
}

export function formatMoney(cents: number, currency = "usd") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

export const SEAT_PLANS = [
  {
    id: "starter",
    name: "Starter",
    seats: 25,
    monthlyCents: 9900,
    blurb: "Small teams getting started with assigned professional training.",
  },
  {
    id: "growth",
    name: "Growth",
    seats: 100,
    monthlyCents: 34900,
    blurb: "Multi-department workforces with admin course assignment.",
  },
  {
    id: "scale",
    name: "Scale",
    seats: 250,
    monthlyCents: 79900,
    blurb: "Larger organizations across languages, skills, and culture.",
  },
] as const;
