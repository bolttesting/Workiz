import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { SEAT_PLANS } from "@workix/config";
import { adminDb } from "./db.js";

export type SeatPlan = {
  id: string;
  name: string;
  blurb: string;
  seats: number;
  monthlyCents: number;
  pricePerSeatCents: number | null;
  minSeats: number | null;
  maxSeats: number | null;
  custom: boolean;
  popular: boolean;
  features: string[];
  sortOrder: number;
  active: boolean;
};

const dataFile = join(dirname(fileURLToPath(import.meta.url)), "../../data/seat-plans.json");

function fromConfig(): SeatPlan[] {
  return SEAT_PLANS.map((plan, index) => ({
    id: plan.id,
    name: plan.name,
    blurb: plan.blurb,
    seats: plan.seats,
    monthlyCents: plan.monthlyCents,
    pricePerSeatCents: "pricePerSeatCents" in plan ? plan.pricePerSeatCents : null,
    minSeats: "minSeats" in plan ? plan.minSeats : null,
    maxSeats: "maxSeats" in plan ? plan.maxSeats : null,
    custom: plan.custom,
    popular: plan.id === "growth",
    features:
      plan.id === "custom"
        ? [
            "__SEATS__ learner seats",
            "Everything in Growth",
            "Dedicated onboarding help",
            "Custom training rollout support",
            "Account manager",
          ]
        : [
            `${plan.seats} learner seats`,
            "Multi-department admin tools",
            "Priority course assignment",
            "Progress dashboards",
            "Priority support",
          ],
    sortOrder: index + 1,
    active: true,
  }));
}

function readFilePlans(): SeatPlan[] {
  try {
    const raw = readFileSync(dataFile, "utf8");
    const parsed = JSON.parse(raw) as SeatPlan[];
    if (Array.isArray(parsed) && parsed.length) return parsed;
  } catch {
    /* fall through to defaults */
  }
  const plans = fromConfig();
  writeFilePlans(plans);
  return plans;
}

function writeFilePlans(plans: SeatPlan[]) {
  mkdirSync(dirname(dataFile), { recursive: true });
  writeFileSync(dataFile, JSON.stringify(plans, null, 2));
}

function mapRow(row: Record<string, unknown>): SeatPlan {
  return {
    id: String(row.id),
    name: String(row.name),
    blurb: String(row.blurb ?? ""),
    seats: Number(row.seats),
    monthlyCents: Number(row.monthly_cents),
    pricePerSeatCents: row.price_per_seat_cents == null ? null : Number(row.price_per_seat_cents),
    minSeats: row.min_seats == null ? null : Number(row.min_seats),
    maxSeats: row.max_seats == null ? null : Number(row.max_seats),
    custom: Boolean(row.custom),
    popular: Boolean(row.popular),
    features: Array.isArray(row.features) ? row.features.map(String) : [],
    sortOrder: Number(row.sort_order ?? 0),
    active: row.active !== false,
  };
}

let tableReady: boolean | null = null;

async function loadFromDb(): Promise<SeatPlan[] | null> {
  if (tableReady === false) return null;
  const { data, error } = await adminDb.from("seat_plans").select("*").order("sort_order", { ascending: true });
  if (error) {
    tableReady = false;
    return null;
  }
  tableReady = true;
  if (!data?.length) {
    const seeded = readFilePlans();
    await adminDb.from("seat_plans").upsert(
      seeded.map((plan) => ({
        id: plan.id,
        name: plan.name,
        blurb: plan.blurb,
        seats: plan.seats,
        monthly_cents: plan.monthlyCents,
        price_per_seat_cents: plan.pricePerSeatCents,
        min_seats: plan.minSeats,
        max_seats: plan.maxSeats,
        custom: plan.custom,
        popular: plan.popular,
        features: plan.features,
        sort_order: plan.sortOrder,
        active: plan.active,
      })),
    );
    return seeded;
  }
  return data.map((row) => mapRow(row as Record<string, unknown>));
}

export async function listSeatPlans() {
  const fromDb = await loadFromDb();
  const plans = (fromDb ?? readFilePlans()).filter((plan) => plan.active);
  return plans.sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function updateSeatPlan(id: string, patch: Partial<SeatPlan>) {
  const current = (await loadFromDb()) ?? readFilePlans();
  const existing = current.find((plan) => plan.id === id);
  if (!existing) return null;
  const next: SeatPlan = {
    ...existing,
    ...patch,
    id: existing.id,
    custom: existing.custom,
  };
  if (!next.name.trim()) throw new Error("Name is required");
  if (!Number.isFinite(next.seats) || next.seats < 1) throw new Error("Seats must be at least 1");
  if (!Number.isFinite(next.monthlyCents) || next.monthlyCents < 0) throw new Error("Price is invalid");

  if (tableReady) {
    const { error } = await adminDb
      .from("seat_plans")
      .update({
        name: next.name,
        blurb: next.blurb,
        seats: next.seats,
        monthly_cents: next.monthlyCents,
        price_per_seat_cents: next.pricePerSeatCents,
        min_seats: next.minSeats,
        max_seats: next.maxSeats,
        popular: next.popular,
        features: next.features,
        active: next.active,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (error) throw new Error(error.message);
    return next;
  }

  writeFilePlans(current.map((plan) => (plan.id === id ? next : plan)));
  return next;
}
