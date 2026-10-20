"use client";
import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { Input, Select } from "./form";
import { Button } from "./button";

export type FilterField =
  | { type: "search"; name: string; label: string; placeholder?: string }
  | { type: "text"; name: string; label: string; placeholder?: string }
  | { type: "select"; name: string; label: string; options: { value: string; label: string }[]; allLabel?: string }
  | { type: "date"; name: string; label: string };

/** URL-driven filters: state lives in the query string so the server can filter and paginate. */
export function FilterBar({ fields }: { fields: FilterField[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = React.useTransition();
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const push = React.useCallback(
    (name: string, value: string) => {
      const next = new URLSearchParams(params.toString());
      if (value) next.set(name, value);
      else next.delete(name);
      next.delete("page");
      startTransition(() => router.replace(`${pathname}?${next.toString()}`, { scroll: false }));
    },
    [params, pathname, router],
  );

  const debounced = (name: string, value: string) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => push(name, value), 300);
  };

  const hasFilters = fields.some((f) => params.get(f.name));

  return (
    <div role="search" aria-busy={pending} className="mb-4 flex flex-wrap items-end gap-3 rounded-[14px] border border-line bg-card p-3">
      {fields.map((f) => {
        const value = params.get(f.name) ?? "";
        const id = `f-${f.name}`;
        return (
          <div key={f.name} className={f.type === "search" ? "min-w-56 flex-1" : "min-w-36"}>
            <label htmlFor={id} className="mb-1 block text-xs font-semibold text-muted">
              {f.label}
            </label>
            {f.type === "search" && (
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <Input
                  id={id}
                  type="search"
                  defaultValue={value}
                  key={value}
                  placeholder={f.placeholder}
                  className="pl-9"
                  onChange={(e) => debounced(f.name, e.target.value.trim())}
                />
              </div>
            )}
            {f.type === "text" && (
              <Input id={id} defaultValue={value} key={value} placeholder={f.placeholder} onChange={(e) => debounced(f.name, e.target.value.trim())} />
            )}
            {f.type === "select" && (
              <Select id={id} value={value} onChange={(e) => push(f.name, e.target.value)}>
                <option value="">{f.allLabel ?? "All"}</option>
                {f.options.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            )}
            {f.type === "date" && <Input id={id} type="date" value={value} onChange={(e) => push(f.name, e.target.value)} />}
          </div>
        );
      })}
      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          className="mb-1"
          onClick={() => startTransition(() => router.replace(pathname, { scroll: false }))}
        >
          <X className="h-4 w-4" /> Clear filters
        </Button>
      )}
    </div>
  );
}
