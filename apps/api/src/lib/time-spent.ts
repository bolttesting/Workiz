import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { adminDb } from "./db.js";

const dataFile = join(dirname(fileURLToPath(import.meta.url)), "../../data/time-spent.json");
let columnReady: boolean | null = null;

function readMap(): Record<string, number> {
  try {
    const parsed = JSON.parse(readFileSync(dataFile, "utf8")) as Record<string, number>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeMap(map: Record<string, number>) {
  mkdirSync(dirname(dataFile), { recursive: true });
  writeFileSync(dataFile, JSON.stringify(map));
}

function key(userId: string, lessonId: string) {
  return `${userId}:${lessonId}`;
}

export async function addSecondsSpent(userId: string, lessonId: string, seconds: number) {
  const add = Math.max(0, Math.min(60, Math.floor(seconds)));
  if (!add) return;
  if (columnReady !== false) {
    const { data: row, error } = await adminDb
      .from("lesson_progress")
      .select("seconds_spent")
      .eq("user_id", userId)
      .eq("lesson_id", lessonId)
      .maybeSingle();
    if (!error) {
      columnReady = true;
      const next = (Number(row?.seconds_spent) || 0) + add;
      await adminDb.from("lesson_progress").update({ seconds_spent: next }).eq("user_id", userId).eq("lesson_id", lessonId);
      return;
    }
    if (!/seconds_spent/i.test(error.message)) return;
    columnReady = false;
  }
  const map = readMap();
  const id = key(userId, lessonId);
  map[id] = (map[id] ?? 0) + add;
  writeMap(map);
}

export async function secondsForUsers(userIds: string[]) {
  const result = new Map<string, number>();
  if (!userIds.length) return result;
  if (columnReady !== false) {
    const { data, error } = await adminDb.from("lesson_progress").select("user_id, lesson_id, seconds_spent").in("user_id", userIds);
    if (!error) {
      columnReady = true;
      for (const row of data ?? []) result.set(key(String(row.user_id), String(row.lesson_id)), Number(row.seconds_spent) || 0);
      return result;
    }
    if (/seconds_spent/i.test(error.message)) columnReady = false;
  }
  const map = readMap();
  for (const [id, seconds] of Object.entries(map)) {
    if (userIds.some((userId) => id.startsWith(`${userId}:`))) result.set(id, seconds);
  }
  return result;
}
