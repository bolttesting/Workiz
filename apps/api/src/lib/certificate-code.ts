import { randomInt } from "node:crypto";
import { adminDb } from "./db.js";

const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
let columnReady: boolean | null = null;

export function makeCertificateNumber() {
  let body = "";
  for (let i = 0; i < 8; i += 1) body += alphabet[randomInt(alphabet.length)];
  return `WX-${body}`;
}

function missingColumn(message: string) {
  return /number/i.test(message) && /column|schema|could not find/i.test(message);
}

export async function ensureCertificateNumber(id: string, current?: string | null) {
  if (current) return current;
  if (columnReady === false) return null;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const number = makeCertificateNumber();
    const { error } = await adminDb.from("certificates").update({ number }).eq("id", id).is("number", null);
    if (!error) {
      columnReady = true;
      const { data } = await adminDb.from("certificates").select("number").eq("id", id).maybeSingle();
      return typeof data?.number === "string" ? data.number : number;
    }
    if (missingColumn(error.message)) {
      columnReady = false;
      return null;
    }
  }
  const { data } = await adminDb.from("certificates").select("number").eq("id", id).maybeSingle();
  return typeof data?.number === "string" ? data.number : null;
}
