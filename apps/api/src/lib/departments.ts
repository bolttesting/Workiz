import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { adminDb } from "./db.js";

type Store = { members: Record<string, string>; invites: Record<string, string> };

const dataFile = join(dirname(fileURLToPath(import.meta.url)), "../../data/departments.json");

let memberColumn: boolean | null = null;
let inviteColumn: boolean | null = null;

function readStore(): Store {
  try {
    const parsed = JSON.parse(readFileSync(dataFile, "utf8")) as Store;
    return {
      members: parsed?.members ?? {},
      invites: parsed?.invites ?? {},
    };
  } catch {
    return { members: {}, invites: {} };
  }
}

function writeStore(store: Store) {
  mkdirSync(dirname(dataFile), { recursive: true });
  writeFileSync(dataFile, JSON.stringify(store, null, 2));
}

function missing(message: string) {
  return /department/i.test(message) && /column|schema cache|does not exist/i.test(message);
}

function clean(value: string | null | undefined) {
  const text = (value ?? "").trim();
  return text.length ? text.slice(0, 80) : null;
}

export async function memberDepartments(userIds: string[]) {
  const result: Record<string, string | null> = {};
  for (const id of userIds) result[id] = null;
  if (!userIds.length) return result;

  if (memberColumn !== false) {
    const { data, error } = await adminDb.from("profiles").select("id, department").in("id", userIds);
    if (!error) {
      memberColumn = true;
      for (const row of data ?? []) result[String(row.id)] = clean(row.department as string | null);
      return result;
    }
    if (missing(error.message)) memberColumn = false;
  }

  const store = readStore();
  for (const id of userIds) result[id] = store.members[id] ?? null;
  return result;
}

export async function setMemberDepartment(userId: string, department: string | null) {
  const value = clean(department);
  if (memberColumn !== false) {
    const { error } = await adminDb.from("profiles").update({ department: value }).eq("id", userId);
    if (!error) {
      memberColumn = true;
      return value;
    }
    if (!missing(error.message)) throw new Error(error.message);
    memberColumn = false;
  }
  const store = readStore();
  if (value) store.members[userId] = value;
  else delete store.members[userId];
  writeStore(store);
  return value;
}

export async function inviteDepartments(inviteIds: string[]) {
  const result: Record<string, string | null> = {};
  for (const id of inviteIds) result[id] = null;
  if (!inviteIds.length) return result;

  if (inviteColumn !== false) {
    const { data, error } = await adminDb.from("invites").select("id, department").in("id", inviteIds);
    if (!error) {
      inviteColumn = true;
      for (const row of data ?? []) result[String(row.id)] = clean(row.department as string | null);
      return result;
    }
    if (missing(error.message)) inviteColumn = false;
  }

  const store = readStore();
  for (const id of inviteIds) result[id] = store.invites[id] ?? null;
  return result;
}

export async function setInviteDepartment(inviteId: string, department: string | null) {
  const value = clean(department);
  if (inviteColumn !== false) {
    const { error } = await adminDb.from("invites").update({ department: value }).eq("id", inviteId);
    if (!error) {
      inviteColumn = true;
      return value;
    }
    if (!missing(error.message)) throw new Error(error.message);
    inviteColumn = false;
  }
  const store = readStore();
  if (value) store.invites[inviteId] = value;
  else delete store.invites[inviteId];
  writeStore(store);
  return value;
}
