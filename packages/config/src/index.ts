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

/** Per-seat rate for the Custom plan ($20 / user / month). */
export const CUSTOM_SEAT_PRICE_CENTS = 2000;

export const COURSE_DEPARTMENTS = [
  "Leadership",
  "Product",
  "Communication",
  "Culture",
  "Finance",
  "Skills",
] as const;

export type CourseDepartment = (typeof COURSE_DEPARTMENTS)[number];

const SKILL_LEVELS = new Set(["beginner", "intermediate", "advanced", "expert"]);

const COURSE_DEPARTMENT_BY_SLUG: Record<string, CourseDepartment> = {
  "leadership-foundations": "Leadership",
  "product-thinking": "Product",
  "workplace-communication": "Communication",
  "cultural-awareness": "Culture",
  "financial-literacy": "Finance",
  "professional-skills": "Skills",
};

/** Resolve a course department badge (uses `level` when it stores a department name). */
export function courseDepartment(course: { slug: string; level: string | null }): string {
  const raw = course.level?.trim();
  if (raw && !SKILL_LEVELS.has(raw.toLowerCase())) {
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  }
  return COURSE_DEPARTMENT_BY_SLUG[course.slug] ?? "General";
}

export const SEAT_PLANS = [
  {
    id: "growth",
    name: "Growth",
    seats: 100,
    monthlyCents: 34900,
    blurb: "Multi-department workforces with admin course assignment.",
    custom: false as const,
  },
  {
    id: "custom",
    name: "Custom",
    seats: 250,
    monthlyCents: 250 * CUSTOM_SEAT_PRICE_CENTS,
    pricePerSeatCents: CUSTOM_SEAT_PRICE_CENTS,
    minSeats: 50,
    maxSeats: 500,
    blurb: "Pick the exact seats you need — priced per learner.",
    custom: true as const,
  },
] as const;
