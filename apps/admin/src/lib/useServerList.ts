"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useDebouncedValue } from "@workix/ui";
import { apiClient } from "@/lib/api";

type PagedResponse = { total?: number; page?: number; pageSize?: number } & Record<string, unknown>;

function readUrl() {
  const params = new URLSearchParams(window.location.search);
  return { q: params.get("q") ?? "", page: Math.max(1, Number(params.get("page")) || 1) };
}

/**
 * Server-paged admin list: search (debounced), filters and page live in the URL
 * (`?q=&page=`) so the topbar search and the back button land on the same view.
 */
export function useServerList<Row>({
  path,
  key,
  filters = {},
  pageSize = 25,
}: {
  path: string;
  /** Response field that holds the rows, e.g. "users". */
  key: string;
  filters?: Record<string, string>;
  pageSize?: number;
}) {
  const [query, setQueryState] = useState("");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const request = useRef(0);
  const debouncedQuery = useDebouncedValue(query, 300);
  const filterKey = JSON.stringify(filters);

  useEffect(() => {
    const initial = readUrl();
    setQueryState(initial.q);
    setPage(initial.page);
    setReady(true);
  }, []);

  const setQuery = useCallback((value: string) => {
    setQueryState(value);
    setPage(1);
  }, []);

  // Reset to page 1 when a filter changes (not on first mount, which may restore ?page=).
  const firstFilter = useRef(true);
  useEffect(() => {
    if (firstFilter.current) {
      firstFilter.current = false;
      return;
    }
    setPage(1);
  }, [filterKey]);

  useEffect(() => {
    if (!ready) return;
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (debouncedQuery.trim()) params.set("q", debouncedQuery.trim());
    for (const [name, value] of Object.entries(JSON.parse(filterKey) as Record<string, string>)) {
      if (value) params.set(name, value);
    }

    const url = new URL(window.location.href);
    url.searchParams.delete("q");
    url.searchParams.delete("page");
    if (debouncedQuery.trim()) url.searchParams.set("q", debouncedQuery.trim());
    if (page > 1) url.searchParams.set("page", String(page));
    window.history.replaceState(null, "", url);

    const id = ++request.current;
    setLoading(true);
    apiClient<PagedResponse>(`${path}?${params}`)
      .then((res) => {
        if (id !== request.current) return;
        setRows((res[key] as Row[] | undefined) ?? []);
        setTotal(res.total ?? 0);
        setError(null);
      })
      .catch((err) => {
        if (id === request.current) setError((err as Error).message);
      })
      .finally(() => {
        if (id === request.current) setLoading(false);
      });
  }, [ready, path, key, page, pageSize, debouncedQuery, filterKey, reloadToken]);

  const reload = useCallback(() => setReloadToken((n) => n + 1), []);

  return { rows, total, page, setPage, pageSize, query, setQuery, loading, error, setError, reload };
}
