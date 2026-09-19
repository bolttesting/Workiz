"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

export type CartItem = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  thumbnail_url: string | null;
  price_cents: number;
  currency: string;
};

const STORAGE_KEY = "workiz-cart-v1";
const EMPTY: CartItem[] = [];
const listeners = new Set<() => void>();

let cacheRaw = "";
let cacheItems: CartItem[] = EMPTY;

function parseItems(raw: string): CartItem[] {
  try {
    const parsed = JSON.parse(raw) as CartItem[];
    return Array.isArray(parsed) ? parsed : EMPTY;
  } catch {
    return EMPTY;
  }
}

function readRaw() {
  if (typeof window === "undefined") return "[]";
  return window.localStorage.getItem(STORAGE_KEY) ?? "[]";
}

function getSnapshot(): CartItem[] {
  const raw = readRaw();
  if (raw !== cacheRaw) {
    cacheRaw = raw;
    cacheItems = parseItems(raw);
  }
  return cacheItems;
}

function getServerSnapshot(): CartItem[] {
  return EMPTY;
}

function emit() {
  for (const listener of listeners) listener();
}

function writeItems(items: CartItem[]) {
  const raw = JSON.stringify(items);
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, raw);
  }
  cacheRaw = raw;
  cacheItems = items;
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (typeof window !== "undefined") {
    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) {
        cacheRaw = "";
        emit();
      }
    };
    window.addEventListener("storage", onStorage);
    queueMicrotask(() => {
      cacheRaw = "";
      emit();
    });
    return () => {
      listeners.delete(listener);
      window.removeEventListener("storage", onStorage);
    };
  }
  return () => listeners.delete(listener);
}

export function useCartItems() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function useCart() {
  const items = useCartItems();
  const count = items.length;
  const totalCents = useMemo(
    () => items.reduce((sum, item) => sum + item.price_cents, 0),
    [items],
  );

  const addItem = useCallback((item: CartItem) => {
    const current = getSnapshot();
    if (current.some((row) => row.id === item.id)) return false;
    writeItems([...current, item]);
    return true;
  }, []);

  const removeItem = useCallback((id: string) => {
    writeItems(getSnapshot().filter((row) => row.id !== id));
  }, []);

  const clear = useCallback(() => {
    writeItems([]);
  }, []);

  const hasItem = useCallback(
    (id: string) => items.some((row) => row.id === id),
    [items],
  );

  return { items, count, totalCents, addItem, removeItem, clear, hasItem };
}
