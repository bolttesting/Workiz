import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { applyInviteDues } from "./due-dates.js";
import { adminDb } from "./db.js";

const dataFile = join(dirname(fileURLToPath(import.meta.url)), "../../data/invite-courses.json");

let columnReady: boolean | null = null;

function readFileMap(): Record<string, string[]> {
  try {
    const parsed = JSON.parse(readFileSync(dataFile, "utf8")) as Record<string, string[]>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeFileMap(map: Record<string, string[]>) {
  mkdirSync(dirname(dataFile), { recursive: true });
  writeFileSync(dataFile, JSON.stringify(map, null, 2));
}

function missingColumn(message: string) {
  return /course_ids/i.test(message);
}

export async function courseIdsForInvite(inviteId: string) {
  const all = await courseIdsForInvites([inviteId]);
  return all[inviteId] ?? [];
}

export async function courseIdsForInvites(inviteIds: string[]) {
  const result: Record<string, string[]> = {};
  for (const id of inviteIds) result[id] = [];
  if (!inviteIds.length) return result;

  if (columnReady !== false) {
    const { data, error } = await adminDb.from("invites").select("id, course_ids").in("id", inviteIds);
    if (!error) {
      columnReady = true;
      for (const row of data ?? []) {
        const ids = Array.isArray(row.course_ids) ? row.course_ids.map(String) : [];
        result[String(row.id)] = ids;
      }
      return result;
    }
    if (missingColumn(error.message)) columnReady = false;
  }

  const map = readFileMap();
  for (const id of inviteIds) result[id] = map[id] ?? [];
  return result;
}

export async function setInviteCourseIds(inviteId: string, courseIds: string[]) {
  const unique = Array.from(new Set(courseIds));
  if (columnReady !== false) {
    const { error } = await adminDb.from("invites").update({ course_ids: unique }).eq("id", inviteId);
    if (!error) {
      columnReady = true;
      return unique;
    }
    if (!missingColumn(error.message)) throw new Error(error.message);
    columnReady = false;
  }
  const map = readFileMap();
  map[inviteId] = unique;
  writeFileMap(map);
  return unique;
}

export async function enrollInviteCourses(userId: string, inviteId: string) {
  const courseIds = await courseIdsForInvite(inviteId);
  for (const courseId of courseIds) {
    const { data: existing } = await adminDb
      .from("enrollments")
      .select("id")
      .eq("user_id", userId)
      .eq("course_id", courseId)
      .maybeSingle();
    if (!existing) {
      await adminDb.from("enrollments").insert({ user_id: userId, course_id: courseId, source: "seat" });
    }
  }
  await applyInviteDues(userId, inviteId);
}
