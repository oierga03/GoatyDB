"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";

type Option = { value: string; label: string };

export function TeamsFilters({
  splits,
  divisions,
  selectedSplit,
}: {
  splits: Option[];
  divisions: Option[];
  selectedSplit: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [q, setQ] = useState(searchParams.get("q") ?? "");

  function pushParams(next: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    startTransition(() => {
      router.push(`/teams?${params.toString()}`);
    });
  }

  const hasFilters = !!(searchParams.get("q") || searchParams.get("division"));
  const selectClass =
    "h-9 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 text-sm text-[var(--color-muted)] outline-none focus:border-[var(--color-accent)] focus:text-[var(--color-text)] transition-colors";

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        pushParams({ q });
      }}
    >
      {/* Buscador protagonista */}
      <div className="relative">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--color-muted)]"
          aria-hidden
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar equipo por nombre…"
          aria-label="Buscar equipo por nombre"
          className="h-12 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] pl-12 pr-28 text-base outline-none focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/20 transition-colors"
        />
        <button
          type="submit"
          disabled={isPending}
          className="btn-primary absolute right-1.5 top-1/2 h-9 -translate-y-1/2"
        >
          {isPending ? "…" : "Buscar"}
        </button>
      </div>

      {/* Filtros compactos */}
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-[var(--color-muted)]">Split</span>
          <select
            value={selectedSplit}
            onChange={(e) => pushParams({ split: e.target.value, division: "" })}
            className={`${selectClass} w-auto min-w-[9rem]`}
          >
            {splits.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-xs text-[var(--color-muted)]">División</span>
          <select
            value={searchParams.get("division") ?? ""}
            onChange={(e) => pushParams({ division: e.target.value })}
            className={`${selectClass} w-auto min-w-[8rem]`}
          >
            <option value="">Todas</option>
            {divisions.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
        </div>

        {hasFilters && (
          <button
            type="button"
            onClick={() => {
              setQ("");
              const params = new URLSearchParams();
              if (selectedSplit) params.set("split", selectedSplit);
              startTransition(() => router.push(`/teams?${params.toString()}`));
            }}
            className="ml-auto rounded-lg px-2.5 py-1 text-xs text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-white/5 transition-colors"
          >
            Limpiar filtros
          </button>
        )}
      </div>
    </form>
  );
}
