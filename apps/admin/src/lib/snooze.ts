const KEY = "workix-attention-snooze";

function today() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Dubai" });
}

function read(): Record<string, string> {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || "{}") as Record<string, string>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function snoozedToday(id: string) {
  if (typeof window === "undefined") return false;
  return read()[id] === today();
}

export function snoozeToday(id: string) {
  const next = read();
  next[id] = today();
  localStorage.setItem(KEY, JSON.stringify(next));
}
