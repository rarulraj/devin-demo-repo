"use client";

import { Search, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { cn } from "@/lib/utils";

export type FilterOption = { value: string; label: string };

export type FilterDefinition = {
  key: string;
  label: string;
  options: FilterOption[];
};

export function FilterBar({
  search,
  filters,
  resultSummary,
}: {
  search?: { key: string; placeholder: string };
  filters: FilterDefinition[];
  resultSummary?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const searchKey = search?.key ?? "q";
  const [term, setTerm] = useState(searchParams.get(searchKey) ?? "");

  function apply(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    startTransition(() => {
      router.replace(params.size ? `${pathname}?${params}` : pathname, { scroll: false });
    });
  }

  const activeCount = [search ? searchKey : null, ...filters.map((f) => f.key)].filter(
    (key) => key && searchParams.get(key),
  ).length;

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-line bg-surface px-4 py-2.5">
      {search ? (
        <div className="relative">
          <Search
            aria-hidden
            className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-ink-subtle"
          />
          <input
            type="search"
            value={term}
            aria-label={search.placeholder}
            placeholder={search.placeholder}
            onChange={(event) => {
              setTerm(event.target.value);
              apply(searchKey, event.target.value.trim());
            }}
            className="h-8 w-64 rounded-[3px] border border-line-strong bg-surface pl-7 pr-2 text-[13px] text-ink placeholder:text-ink-subtle"
          />
        </div>
      ) : null}

      {filters.map((filter) => {
        const value = searchParams.get(filter.key) ?? "";
        return (
          <label key={filter.key} className="flex items-center gap-1.5">
            <span className="text-[12px] text-ink-muted">{filter.label}</span>
            <select
              value={value}
              onChange={(event) => apply(filter.key, event.target.value)}
              className={cn(
                "h-8 rounded-[3px] border bg-surface px-2 text-[13px] text-ink",
                value ? "border-accent bg-accent-soft" : "border-line-strong",
              )}
            >
              <option value="">All</option>
              {filter.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        );
      })}

      {activeCount > 0 ? (
        <button
          type="button"
          onClick={() => {
            setTerm("");
            startTransition(() => router.replace(pathname, { scroll: false }));
          }}
          className="inline-flex h-8 items-center gap-1 rounded-[3px] px-2 text-[12.5px] text-ink-muted hover:bg-canvas hover:text-ink"
        >
          <X aria-hidden className="size-3.5" />
          Clear filters
        </button>
      ) : null}

      {resultSummary ? (
        <span className="ml-auto text-[12px] text-ink-muted tabular">{resultSummary}</span>
      ) : null}
    </div>
  );
}
