function allowedAppOrigin(value: string) {
  const origins = [process.env.NEXT_PUBLIC_LEARN_URL, process.env.NEXT_PUBLIC_ADMIN_URL].filter(Boolean) as string[];
  try {
    const url = new URL(value);
    return origins.some((origin) => new URL(origin).origin === url.origin);
  } catch {
    return false;
  }
}

export function getSafeNextPath(raw: string | null | undefined, fallback = "/") {
  if (!raw) return fallback;
  const value = raw.trim();
  if (value.startsWith("/") && !value.startsWith("//") && !value.includes("://")) return value;
  if (allowedAppOrigin(value)) return value;
  return fallback;
}

export function nextIsLearnApp(raw: string | null | undefined) {
  if (!raw) return false;
  const learn = process.env.NEXT_PUBLIC_LEARN_URL ?? "http://localhost:3001";
  try {
    return new URL(raw).origin === new URL(learn).origin;
  } catch {
    return false;
  }
}
