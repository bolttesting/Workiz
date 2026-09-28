import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { adminDb } from "./db.js";

const dataFile = join(dirname(fileURLToPath(import.meta.url)), "../../data/department-leads.json");
let columnReady: boolean | null = null;

function readMap(): Record<string, boolean> {
  try {
    const parsed = JSON.parse(readFileSync(dataFile, "utf8")) as Record<string, boolean>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeMap(map: Record<string, boolean>) {
  mkdirSync(dirname(dataFile), { recursive: true });
  writeFileSync(dataFile, JSON.stringify(map, null, 2));
}

export async function leadFlags(userIds: string[]) {
  const result: Record<string, boolean> = {};
  for (const id of userIds) result[id] = false;
  if (!userIds.length) return result;
  if (columnReady !== false) {
    const { data, error } = await adminDb.from("profiles").select("id, department_lead").in("id", userIds);
    if (!error) {
      columnReady = true;
      for (const row of data ?? []) result[String(row.id)] = Boolean(row.department_lead);
      return result;
    }
    if (!/department_lead/i.test(error.message)) return result;
    columnReady = false;
  }
  const map = readMap();
  for (const id of userIds) result[id] = Boolean(map[id]);
  return result;
}

export async function setDepartmentLead(userId: string, lead: boolean) {
  if (columnReady !== false) {
    const { error } = await adminDb.from("profiles").update({ department_lead: lead }).eq("id", userId);
    if (!error) {
      columnReady = true;
      return lead;
    }
    if (!/department_lead/i.test(error.message)) throw new Error(error.message);
    columnReady = false;
  }
  const map = readMap();
  if (lead) map[userId] = true;
  else delete map[userId];
  writeMap(map);
  return lead;
}
