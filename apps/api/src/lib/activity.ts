import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { adminDb } from "./db.js";

const dataFile = join(dirname(fileURLToPath(import.meta.url)), "../../data/org-activity.json");

export type ActivityRow = {
  id: string;
  organizationId: string;
  actorName: string | null;
  action: string;
  detail: string;
  createdAt: string;
};

let tableReady: boolean | null = null;

function readFileRows(): ActivityRow[] {
  try {
    const parsed = JSON.parse(readFileSync(dataFile, "utf8")) as ActivityRow[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeFileRows(rows: ActivityRow[]) {
  mkdirSync(dirname(dataFile), { recursive: true });
  writeFileSync(dataFile, JSON.stringify(rows.slice(0, 200), null, 2));
}

export async function logActivity(organizationId: string, actorId: string, action: string, detail: string) {
  try {
    if (tableReady !== false) {
      const { error } = await adminDb.from("org_activity").insert({
        organization_id: organizationId,
        actor_id: actorId,
        action,
        detail,
      });
      if (!error) {
        tableReady = true;
        return;
      }
      if (!/org_activity/i.test(error.message)) return;
      tableReady = false;
    }
    const { data: actor } = await adminDb.from("profiles").select("full_name, email").eq("id", actorId).maybeSingle();
    const row: ActivityRow = {
      id: crypto.randomUUID(),
      organizationId,
      actorName: actor?.full_name || actor?.email || null,
      action,
      detail,
      createdAt: new Date().toISOString(),
    };
    writeFileRows([row, ...readFileRows()]);
  } catch {
    /* activity must not block the action that was saved */
  }
}

export async function listActivity(organizationId: string) {
  if (tableReady !== false) {
    const { data, error } = await adminDb
      .from("org_activity")
      .select("id, organization_id, actor_id, action, detail, created_at")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(30);
    if (!error) {
      tableReady = true;
      const actorIds = Array.from(new Set((data ?? []).map((row) => row.actor_id).filter(Boolean))) as string[];
      const { data: people } = actorIds.length
        ? await adminDb.from("profiles").select("id, full_name, email").in("id", actorIds)
        : { data: [] as { id: string; full_name: string | null; email: string }[] };
      const names = new Map((people ?? []).map((person) => [person.id, person.full_name || person.email]));
      return (data ?? []).map((row) => ({
        id: row.id as string,
        organizationId,
        actorName: row.actor_id ? names.get(row.actor_id) ?? null : null,
        action: row.action as string,
        detail: row.detail as string,
        createdAt: row.created_at as string,
      }));
    }
    if (/org_activity/i.test(error.message)) tableReady = false;
  }
  return readFileRows()
    .filter((row) => row.organizationId === organizationId)
    .slice(0, 30);
}
