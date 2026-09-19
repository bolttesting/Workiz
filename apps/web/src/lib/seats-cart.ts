"use client";

import { useCallback, useSyncExternalStore } from "react";
import { CUSTOM_SEAT_PRICE_CENTS, SEAT_PLANS } from "@workix/config";

export type SeatsCartSelection = {
  planId: string;
  planName: string;
  seats: number;
  pricePerSeatCents: number;
  monthlyCents: number;
  companyName?: string;
};

const STORAGE_KEY = "workiz-seats-cart-v1";
const CHANGE_EVENT = "workiz-seats-cart";
const listeners = new Set<() => void>();

let cacheRaw: string | null = null;
let cacheSelection: SeatsCartSelection | null = null;

function parseSelection(raw: string): SeatsCartSelection | null {
  try {
    const parsed = JSON.parse(raw) as SeatsCartSelection;
    if (!parsed || typeof parsed.seats !== "number" || !parsed.planId) return null;
    return parsed;
  } catch {
    return null;
  }
}

function readRaw() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(STORAGE_KEY) ?? "";
}

function getSnapshot(): SeatsCartSelection | null {
  const raw = readRaw();
  if (raw !== cacheRaw) {
    cacheRaw = raw;
    cacheSelection = raw ? parseSelection(raw) : null;
  }
  return cacheSelection;
}

function getServerSnapshot(): SeatsCartSelection | null {
  return null;
}

function emit() {
  for (const listener of listeners) listener();
}

function writeSelection(selection: SeatsCartSelection | null) {
  if (typeof window !== "undefined") {
    if (selection) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(selection));
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }
  cacheRaw = selection ? JSON.stringify(selection) : "";
  cacheSelection = selection;
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (typeof window === "undefined") {
    return () => listeners.delete(listener);
  }

  const invalidate = () => {
    cacheRaw = null;
    emit();
  };

  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY || event.key === null) invalidate();
  };

  window.addEventListener("storage", onStorage);
  window.addEventListener(CHANGE_EVENT, invalidate);

  // Re-read after mount so hydration null is replaced by localStorage.
  const timeout = window.setTimeout(invalidate, 0);

  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(CHANGE_EVENT, invalidate);
    window.clearTimeout(timeout);
  };
}

export function buildSeatsSelection(opts: {
  planId: string;
  seats: number;
  companyName?: string;
}): SeatsCartSelection | null {
  const plan = SEAT_PLANS.find((row) => row.id === opts.planId);
  if (!plan) return null;

  if (plan.custom) {
    const min = plan.minSeats;
    const max = plan.maxSeats;
    const seats = Math.max(min, Math.min(max, Math.round(opts.seats)));
    const pricePerSeatCents = plan.pricePerSeatCents ?? CUSTOM_SEAT_PRICE_CENTS;
    return {
      planId: plan.id,
      planName: plan.name,
      seats,
      pricePerSeatCents,
      monthlyCents: seats * pricePerSeatCents,
      companyName: opts.companyName,
    };
  }

  return {
    planId: plan.id,
    planName: plan.name,
    seats: plan.seats,
    pricePerSeatCents: Math.round(plan.monthlyCents / plan.seats),
    monthlyCents: plan.monthlyCents,
    companyName: opts.companyName,
  };
}

export function useSeatsCart() {
  const selection = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setSelection = useCallback((next: SeatsCartSelection | null) => {
    writeSelection(next);
  }, []);

  const clear = useCallback(() => {
    writeSelection(null);
  }, []);

  const updateCompanyName = useCallback((companyName: string) => {
    const current = getSnapshot();
    if (!current) return;
    writeSelection({ ...current, companyName });
  }, []);

  return { selection, setSelection, clear, updateCompanyName };
}
