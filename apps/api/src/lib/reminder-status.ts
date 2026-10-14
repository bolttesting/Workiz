import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const statusFile = join(dirname(fileURLToPath(import.meta.url)), "../../data/reminder-status.json");

export type ReminderStatus = {
  ok: boolean;
  at: string;
  message: string;
};

function readRaw(): ReminderStatus | null {
  try {
    const parsed = JSON.parse(readFileSync(statusFile, "utf8")) as Partial<ReminderStatus>;
    if (typeof parsed.ok !== "boolean" || typeof parsed.at !== "string") return null;
    return { ok: parsed.ok, at: parsed.at, message: typeof parsed.message === "string" ? parsed.message : "" };
  } catch {
    return null;
  }
}

export function readReminderStatus() {
  return readRaw();
}

export function recordReminderFailure(message = "The Monday reminder email did not send.") {
  const next: ReminderStatus = { ok: false, at: new Date().toISOString(), message };
  mkdirSync(dirname(statusFile), { recursive: true });
  writeFileSync(statusFile, JSON.stringify(next, null, 2));
}

export function recordReminderSuccess() {
  const next: ReminderStatus = { ok: true, at: new Date().toISOString(), message: "" };
  mkdirSync(dirname(statusFile), { recursive: true });
  writeFileSync(statusFile, JSON.stringify(next, null, 2));
}
