import { randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { adminDb } from "./db.js";

const dataFile = join(dirname(fileURLToPath(import.meta.url)), "../../data/course-sets.json");

export type CourseSet = {
  id: string;
  organizationId: string;
  name: string;
  courseIds: string[];
  ordered: boolean;
  createdAt: string;
};

let tableReady: boolean | null = null;
let orderedColumn: boolean | null = null;

const orderFile = join(dirname(fileURLToPath(import.meta.url)), "../../data/course-set-order.json");

function readOrderFlags(): Record<string, boolean> {
  try {
    const parsed = JSON.parse(readFileSync(orderFile, "utf8")) as Record<string, boolean>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeOrderFlag(id: string, ordered: boolean) {
  const flags = readOrderFlags();
  flags[id] = ordered;
  mkdirSync(dirname(orderFile), { recursive: true });
  writeFileSync(orderFile, JSON.stringify(flags, null, 2));
}

function readFileSets(): CourseSet[] {
  try {
    const parsed = JSON.parse(readFileSync(dataFile, "utf8")) as CourseSet[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeFileSets(sets: CourseSet[]) {
  mkdirSync(dirname(dataFile), { recursive: true });
  writeFileSync(dataFile, JSON.stringify(sets, null, 2));
}

function uniqueIds(courseIds: string[]) {
  return courseIds.filter((id, index) => courseIds.indexOf(id) === index);
}

function fromRow(row: {
  id: string;
  organization_id: string;
  name: string;
  course_ids: string[] | null;
  created_at: string;
  ordered?: boolean | null;
}): CourseSet {
  return {
    id: row.id,
    organizationId: row.organization_id,
    name: row.name,
    courseIds: Array.isArray(row.course_ids) ? row.course_ids.map(String) : [],
    ordered: Boolean(row.ordered),
    createdAt: row.created_at,
  };
}

function missingTable(message: string) {
  return /course_sets/i.test(message);
}

export async function listCourseSets(organizationId: string) {
  if (tableReady !== false) {
    const columns = orderedColumn === false
      ? "id, organization_id, name, course_ids, created_at"
      : "id, organization_id, name, course_ids, ordered, created_at";
    const { data, error } = await adminDb
      .from("course_sets")
      .select(columns)
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: true });
    if (!error) {
      tableReady = true;
      const flags = orderedColumn === false ? readOrderFlags() : null;
      if (orderedColumn !== false) orderedColumn = true;
      return (data ?? []).map((row) => {
        const set = fromRow(row as never);
        if (flags) set.ordered = Boolean(flags[set.id]);
        return set;
      });
    }
    if (/ordered/i.test(error.message)) {
      orderedColumn = false;
      return listCourseSets(organizationId);
    }
    if (missingTable(error.message)) tableReady = false;
    else throw new Error(error.message);
  }
  const flags = readOrderFlags();
  return readFileSets()
    .filter((set) => set.organizationId === organizationId)
    .map((set) => ({ ...set, ordered: set.ordered || Boolean(flags[set.id]) }));
}

export async function createCourseSet(organizationId: string, name: string, courseIds: string[], ordered = false) {
  const unique = uniqueIds(courseIds);
  if (tableReady !== false && orderedColumn !== false) {
    const { data, error } = await adminDb
      .from("course_sets")
      .insert({ organization_id: organizationId, name, course_ids: unique, ordered })
      .select("id, organization_id, name, course_ids, ordered, created_at")
      .single();
    if (!error && data) {
      tableReady = true;
      orderedColumn = true;
      return fromRow(data);
    }
    if (error && /ordered/i.test(error.message)) orderedColumn = false;
    else if (error && !missingTable(error.message)) throw new Error(error.message);
    else if (error) tableReady = false;
  }
  if (tableReady !== false) {
    const { data, error } = await adminDb
      .from("course_sets")
      .insert({ organization_id: organizationId, name, course_ids: unique })
      .select("id, organization_id, name, course_ids, created_at")
      .single();
    if (!error && data) {
      tableReady = true;
      if (ordered) writeOrderFlag(data.id, true);
      return fromRow({ ...data, ordered });
    }
    if (error && !missingTable(error.message)) throw new Error(error.message);
    if (error) tableReady = false;
  }
  const set: CourseSet = {
    id: randomUUID(),
    organizationId,
    name,
    courseIds: unique,
    ordered,
    createdAt: new Date().toISOString(),
  };
  writeFileSets([...readFileSets(), set]);
  return set;
}

export async function setCourseSetOrdered(organizationId: string, id: string, ordered: boolean) {
  const existing = await getCourseSet(organizationId, id);
  if (!existing) return null;
  if (tableReady !== false && orderedColumn !== false) {
    const { error } = await adminDb.from("course_sets").update({ ordered }).eq("id", id).eq("organization_id", organizationId);
    if (!error) {
      orderedColumn = true;
      return { ...existing, ordered };
    }
    if (!/ordered/i.test(error.message)) throw new Error(error.message);
    orderedColumn = false;
  }
  if (tableReady === false) {
    const sets = readFileSets().map((set) => (set.id === id && set.organizationId === organizationId ? { ...set, ordered } : set));
    writeFileSets(sets);
  } else {
    writeOrderFlag(id, ordered);
  }
  return { ...existing, ordered };
}

export async function deleteCourseSet(organizationId: string, id: string) {
  if (tableReady !== false) {
    const { error } = await adminDb.from("course_sets").delete().eq("id", id).eq("organization_id", organizationId);
    if (!error) {
      tableReady = true;
      return;
    }
    if (!missingTable(error.message)) throw new Error(error.message);
    tableReady = false;
  }
  writeFileSets(readFileSets().filter((set) => !(set.id === id && set.organizationId === organizationId)));
}

export async function getCourseSet(organizationId: string, id: string) {
  const sets = await listCourseSets(organizationId);
  return sets.find((set) => set.id === id) ?? null;
}
