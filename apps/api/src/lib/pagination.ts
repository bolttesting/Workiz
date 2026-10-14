import type { Context } from "hono";

export type PageParams = { page: number; pageSize: number; from: number; to: number };

/**
 * Reads `?page=` (1-based) and `?pageSize=` from the request. Returns null when no page was
 * asked for, so list endpoints can keep their unpaged shape for pickers and quick search.
 */
export function readPage(c: Context, defaultSize = 25, maxSize = 100): PageParams | null {
  const rawPage = c.req.query("page");
  if (rawPage === undefined) return null;
  const page = Math.max(1, Number.parseInt(rawPage, 10) || 1);
  const size = Number.parseInt(c.req.query("pageSize") ?? "", 10);
  const pageSize = Math.min(maxSize, Math.max(1, Number.isFinite(size) ? size : defaultSize));
  const from = (page - 1) * pageSize;
  return { page, pageSize, from, to: from + pageSize - 1 };
}

/** Search text safe to put inside a PostgREST `or=(...ilike...)` filter. */
export function readSearch(c: Context): string {
  return (c.req.query("q") ?? "").replace(/[%*,()\\"]/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string) {
  return UUID.test(value);
}
