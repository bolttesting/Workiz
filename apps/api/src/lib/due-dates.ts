import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { adminDb } from "./db.js";

const dataFile = join(dirname(fileURLToPath(import.meta.url)), "../../data/due-dates.json");

type Store = { enrollments: Record<string, string>; invites: Record<string, string> };

let enrollmentColumn: boolean | null = null;
let inviteColumn: boolean | null = null;

function emptyStore(): Store {
  return { enrollments: {}, invites: {} };
}

function readStore(): Store {
  try {
    const parsed = JSON.parse(readFileSync(dataFile, "utf8")) as Store;
    return {
      enrollments: parsed?.enrollments && typeof parsed.enrollments === "object" ? parsed.enrollments : {},
      invites: parsed?.invites && typeof parsed.invites === "object" ? parsed.invites : {},
    };
  } catch {
    return emptyStore();
  }
}

function writeStore(store: Store) {
  mkdirSync(dirname(dataFile), { recursive: true });
  writeFileSync(dataFile, JSON.stringify(store, null, 2));
}

function pairKey(userId: string, courseId: string) {
  return `${userId}:${courseId}`;
}

function inviteKey(inviteId: string, courseId: string) {
  return `${inviteId}:${courseId}`;
}

export function isDueDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export async function setEnrollmentDue(userId: string, courseId: string, due: string | null) {
  if (due && !isDueDate(due)) throw new Error("Due date must be YYYY-MM-DD");
  if (enrollmentColumn !== false) {
    const { error } = await adminDb.from("enrollments").update({ due_at: due }).eq("user_id", userId).eq("course_id", courseId);
    if (!error) {
      enrollmentColumn = true;
      return;
    }
    if (!/due_at/i.test(error.message)) throw new Error(error.message);
    enrollmentColumn = false;
  }
  const store = readStore();
  const key = pairKey(userId, courseId);
  if (due) store.enrollments[key] = due;
  else delete store.enrollments[key];
  writeStore(store);
}

export async function enrollmentDues(pairs: { user_id: string; course_id: string }[]) {
  const result: Record<string, string | null> = {};
  for (const pair of pairs) result[pairKey(pair.user_id, pair.course_id)] = null;
  if (!pairs.length) return result;

  if (enrollmentColumn !== false) {
    const userIds = Array.from(new Set(pairs.map((pair) => pair.user_id)));
    const { data, error } = await adminDb.from("enrollments").select("user_id, course_id, due_at").in("user_id", userIds);
    if (!error) {
      enrollmentColumn = true;
      for (const row of data ?? []) {
        const key = pairKey(String(row.user_id), String(row.course_id));
        if (!(key in result)) continue;
        result[key] = row.due_at ? String(row.due_at).slice(0, 10) : null;
      }
      return result;
    }
    if (/due_at/i.test(error.message)) enrollmentColumn = false;
  }

  const store = readStore();
  for (const key of Object.keys(result)) result[key] = store.enrollments[key] ?? null;
  return result;
}

async function loadInviteDueMaps(inviteIds: string[]) {
  const result: Record<string, Record<string, string>> = {};
  for (const id of inviteIds) result[id] = {};
  if (!inviteIds.length) return result;

  if (inviteColumn !== false) {
    const { data, error } = await adminDb.from("invites").select("id, course_due").in("id", inviteIds);
    if (!error) {
      inviteColumn = true;
      for (const row of data ?? []) {
        const raw = row.course_due;
        const map: Record<string, string> = {};
        if (raw && typeof raw === "object" && !Array.isArray(raw)) {
          for (const [courseId, due] of Object.entries(raw as Record<string, unknown>)) {
            if (typeof due === "string" && isDueDate(due.slice(0, 10))) map[courseId] = due.slice(0, 10);
          }
        }
        result[String(row.id)] = map;
      }
      return result;
    }
    if (/course_due/i.test(error.message)) inviteColumn = false;
  }

  const store = readStore();
  for (const inviteId of inviteIds) {
    const map: Record<string, string> = {};
    const prefix = `${inviteId}:`;
    for (const [key, due] of Object.entries(store.invites)) {
      if (key.startsWith(prefix)) map[key.slice(prefix.length)] = due;
    }
    result[inviteId] = map;
  }
  return result;
}

export async function setInviteCourseDue(inviteId: string, courseId: string, due: string | null) {
  if (due && !isDueDate(due)) throw new Error("Due date must be YYYY-MM-DD");
  const current = (await loadInviteDueMaps([inviteId]))[inviteId] ?? {};
  if (due) current[courseId] = due;
  else delete current[courseId];

  if (inviteColumn !== false) {
    const { error } = await adminDb.from("invites").update({ course_due: current }).eq("id", inviteId);
    if (!error) {
      inviteColumn = true;
      return;
    }
    if (!/course_due/i.test(error.message)) throw new Error(error.message);
    inviteColumn = false;
  }

  const store = readStore();
  for (const key of Object.keys(store.invites)) {
    if (key.startsWith(`${inviteId}:`)) delete store.invites[key];
  }
  for (const [id, value] of Object.entries(current)) store.invites[inviteKey(inviteId, id)] = value;
  writeStore(store);
}

export async function applyInviteDues(userId: string, inviteId: string) {
  const map = (await loadInviteDueMaps([inviteId]))[inviteId] ?? {};
  for (const [courseId, due] of Object.entries(map)) {
    await setEnrollmentDue(userId, courseId, due);
  }
}
