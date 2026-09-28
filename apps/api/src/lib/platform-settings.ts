import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { adminDb } from "./db.js";

export type PlatformSettings = {
  quizPassMark: number;
  dueSoonDays: number;
  inviteDays: number;
  certificateIssuer: string;
};

const defaults: PlatformSettings = {
  quizPassMark: 70,
  dueSoonDays: 7,
  inviteDays: 7,
  certificateIssuer: "WORKIZ",
};

const dataFile = join(dirname(fileURLToPath(import.meta.url)), "../../data/platform-settings.json");
let tableReady: boolean | null = null;

function clamp(value: number, min: number, max: number, fallback: number) {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.round(value)));
}

export function normalizePlatformSettings(input: Partial<PlatformSettings>): PlatformSettings {
  return {
    quizPassMark: clamp(Number(input.quizPassMark), 1, 100, defaults.quizPassMark),
    dueSoonDays: clamp(Number(input.dueSoonDays), 1, 60, defaults.dueSoonDays),
    inviteDays: clamp(Number(input.inviteDays), 1, 30, defaults.inviteDays),
    certificateIssuer: (input.certificateIssuer ?? defaults.certificateIssuer).trim().slice(0, 80) || defaults.certificateIssuer,
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
  return normalizePlatformSettings({
    quizPassMark: Number(row.quiz_pass_mark),
    dueSoonDays: Number(row.due_soon_days),
    inviteDays: Number(row.invite_days),
    certificateIssuer: String(row.certificate_issuer ?? defaults.certificateIssuer),
  });
}

export async function getPlatformSettings() {
  if (tableReady !== false) {
    const { data, error } = await adminDb.from("platform_settings").select("*").eq("id", "default").maybeSingle();
    if (!error) {
      tableReady = true;
      if (!data) return defaults;
      return fromRow(data);
    }
    if (/platform_settings/i.test(error.message)) tableReady = false;
  }
  return readFileSettings();
}

export async function savePlatformSettings(patch: Partial<PlatformSettings>) {
  const next = normalizePlatformSettings({ ...(await getPlatformSettings()), ...patch });
  if (tableReady !== false) {
    const row = {
      id: "default",
      quiz_pass_mark: next.quizPassMark,
      due_soon_days: next.dueSoonDays,
      invite_days: next.inviteDays,
      certificate_issuer: next.certificateIssuer,
      updated_at: new Date().toISOString(),
    };
    const { error } = await adminDb.from("platform_settings").upsert(row, { onConflict: "id" });
    if (!error) {
      tableReady = true;
      return next;
    }
    if (!/platform_settings/i.test(error.message)) throw new Error(error.message);
    tableReady = false;
  }
  writeFileSettings(next);
  return next;
}
