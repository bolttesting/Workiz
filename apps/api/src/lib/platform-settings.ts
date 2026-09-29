import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { adminDb } from "./db.js";

export type PlatformSettings = {
  quizPassMark: number;
  dueSoonDays: number;
  inviteDays: number;
  certificateIssuer: string;
  whatsapp: string;
  phone: string;
  emails: string[];
  address: string;
};

const defaults: PlatformSettings = {
  quizPassMark: 70,
  dueSoonDays: 7,
  inviteDays: 7,
  certificateIssuer: "WORKIZ",
  whatsapp: "+971 4 320 8888",
  phone: "+971 4 320 8888",
  emails: ["hello@workiz.com"],
  address: "Workiz Support Solutions - FZCO, Dubai Silicon Oasis, Dubai, United Arab Emirates",
};

const dataFile = join(dirname(fileURLToPath(import.meta.url)), "../../data/platform-settings.json");
let tableReady: boolean | null = null;

function clamp(value: number, min: number, max: number, fallback: number) {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.round(value)));
}

function cleanLine(value: unknown, fallback: string, max: number) {
  if (typeof value !== "string") return fallback;
  return value.trim().slice(0, max);
}

function cleanEmails(value: unknown, fallback: string[]) {
  if (!Array.isArray(value)) return fallback;
  const seen = new Set<string>();
  const emails: string[] = [];
  for (const item of value) {
    const email = String(item ?? "").trim().toLowerCase().slice(0, 120);
    if (!email || seen.has(email) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) continue;
    seen.add(email);
    emails.push(email);
    if (emails.length >= 8) break;
  }
  return emails;
}

export function normalizePlatformSettings(input: Partial<PlatformSettings>): PlatformSettings {
  return {
    quizPassMark: clamp(Number(input.quizPassMark), 1, 100, defaults.quizPassMark),
    dueSoonDays: clamp(Number(input.dueSoonDays), 1, 60, defaults.dueSoonDays),
    inviteDays: clamp(Number(input.inviteDays), 1, 30, defaults.inviteDays),
    certificateIssuer: (input.certificateIssuer ?? defaults.certificateIssuer).trim().slice(0, 80) || defaults.certificateIssuer,
    whatsapp: cleanLine(input.whatsapp, defaults.whatsapp, 40),
    phone: cleanLine(input.phone, defaults.phone, 40),
    emails: cleanEmails(input.emails, defaults.emails),
    address: cleanLine(input.address, defaults.address, 300),
  };
}

function readFileSettings(): PlatformSettings {
  try {
    const parsed = JSON.parse(readFileSync(dataFile, "utf8")) as Partial<PlatformSettings>;
    return normalizePlatformSettings({ ...defaults, ...parsed });
  } catch {
    return defaults;
  }
}

function writeFileSettings(settings: PlatformSettings) {
  mkdirSync(dirname(dataFile), { recursive: true });
  writeFileSync(dataFile, JSON.stringify(settings, null, 2));
}

function fromRow(row: Record<string, unknown>): PlatformSettings {
  const hasContact = "whatsapp" in row || "phone" in row || "emails" in row || "address" in row;
  const file = hasContact ? null : readFileSettings();
  return normalizePlatformSettings({
    quizPassMark: Number(row.quiz_pass_mark),
    dueSoonDays: Number(row.due_soon_days),
    inviteDays: Number(row.invite_days),
    certificateIssuer: String(row.certificate_issuer ?? defaults.certificateIssuer),
    whatsapp: hasContact ? String(row.whatsapp ?? "") : file?.whatsapp,
    phone: hasContact ? String(row.phone ?? "") : file?.phone,
    emails: hasContact ? (Array.isArray(row.emails) ? row.emails : []) : file?.emails,
    address: hasContact ? String(row.address ?? "") : file?.address,
  });
}

export async function getPlatformSettings() {
  if (tableReady !== false) {
    const { data, error } = await adminDb.from("platform_settings").select("*").eq("id", "default").maybeSingle();
    if (!error) {
      tableReady = true;
      if (!data) return { ...defaults, ...contactFromFile() };
      return fromRow(data);
    }
    if (/platform_settings/i.test(error.message)) tableReady = false;
  }
  return readFileSettings();
}

function contactFromFile(): Pick<PlatformSettings, "whatsapp" | "phone" | "emails" | "address"> {
  const file = readFileSettings();
  return { whatsapp: file.whatsapp, phone: file.phone, emails: file.emails, address: file.address };
}

export function publicContact(settings: PlatformSettings) {
  return {
    whatsapp: settings.whatsapp,
    phone: settings.phone,
    emails: settings.emails,
    address: settings.address,
  };
}

export async function savePlatformSettings(patch: Partial<PlatformSettings>) {
  const next = normalizePlatformSettings({ ...(await getPlatformSettings()), ...patch });
  if (tableReady !== false) {
    const base = {
      id: "default",
      quiz_pass_mark: next.quizPassMark,
      due_soon_days: next.dueSoonDays,
      invite_days: next.inviteDays,
      certificate_issuer: next.certificateIssuer,
      updated_at: new Date().toISOString(),
    };
    const row = {
      ...base,
      whatsapp: next.whatsapp,
      phone: next.phone,
      emails: next.emails,
      address: next.address,
    };
    const { error } = await adminDb.from("platform_settings").upsert(row, { onConflict: "id" });
    if (!error) {
      tableReady = true;
      return next;
    }
    if (/column|whatsapp|schema cache/i.test(error.message)) {
      const retry = await adminDb.from("platform_settings").upsert(base, { onConflict: "id" });
      if (retry.error && !/platform_settings/i.test(retry.error.message)) throw new Error(retry.error.message);
      writeFileSettings(next);
      return next;
    }
    if (!/platform_settings/i.test(error.message)) throw new Error(error.message);
    tableReady = false;
  }
  writeFileSettings(next);
  return next;
}
