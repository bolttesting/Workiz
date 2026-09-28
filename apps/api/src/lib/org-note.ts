import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { adminDb } from "./db.js";

const dataFile = join(dirname(fileURLToPath(import.meta.url)), "../../data/org-notes.json");
let columnReady: boolean | null = null;

function readMap(): Record<string, string> {
  try {
    const parsed = JSON.parse(readFileSync(dataFile, "utf8")) as Record<string, string>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeMap(map: Record<string, string>) {
  mkdirSync(dirname(dataFile), { recursive: true });
  writeFileSync(dataFile, JSON.stringify(map, null, 2));
}

export async function getOrgNote(organizationId: string) {
  if (columnReady !== false) {
    const { data, error } = await adminDb.from("organizations").select("dashboard_note").eq("id", organizationId).maybeSingle();
    if (!error) {
      columnReady = true;
      return typeof data?.dashboard_note === "string" && data.dashboard_note.trim() ? data.dashboard_note.trim() : null;
    }
    if (!/dashboard_note/i.test(error.message)) return null;
    columnReady = false;
  }
  return readMap()[organizationId]?.trim() || null;
}

export async function setOrgNote(organizationId: string, note: string | null) {
  const value = note?.trim() || null;
  if (columnReady !== false) {
    const { error } = await adminDb.from("organizations").update({ dashboard_note: value }).eq("id", organizationId);
    if (!error) {
      columnReady = true;
      return value;
    }
    if (!/dashboard_note/i.test(error.message)) throw new Error(error.message);
    columnReady = false;
  }
  const map = readMap();
  if (value) map[organizationId] = value;
  else delete map[organizationId];
  writeMap(map);
  return value;
}

export async function companyNameForUser(userId: string) {
  const { data: profile } = await adminDb.from("profiles").select("organization_id").eq("id", userId).maybeSingle();
  if (!profile?.organization_id) return null;
  const { data: org } = await adminDb.from("organizations").select("name").eq("id", profile.organization_id).maybeSingle();
  return org?.name ?? null;
}
