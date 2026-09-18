/** Shared cookie Domain for auth across www / learn / admin. */
export function authCookieDomain(): string | undefined {
  const domain =
    process.env.NEXT_PUBLIC_COOKIE_DOMAIN || process.env.COOKIE_DOMAIN || "";
  const trimmed = domain.trim();
  // Host-only cookies (no Domain) work across ports on localhost.
  // Domain=localhost is unreliable in browsers for www.localhost / admin.localhost.
  if (!trimmed || trimmed === "localhost" || trimmed === ".localhost") {
    return undefined;
  }
  return trimmed;
}
