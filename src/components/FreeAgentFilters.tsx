"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { ELO_ORDER, ELO_LABELS, SELECTABLE_ROLES } from "@/lib/free-agents";
import { roleLabel } from "@/lib/labels";

/// Filtros del tablón. Un capitán busca por rol y por elo mínimo, así que son
/// los dos únicos filtros que hay: lo demás es ruido.
export function FreeAgentFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function pushParams(next: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    startTransition(() => router.push(`/tablon?${params.toString()}`));
  }

  const inputClass =
    "w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm outline-none focus:border-[var(--color-accent)] transition-colors";

  const hasFilters = searchParams.get("role") || searchParams.get("minElo");

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <div>
        <label className="mb-1 block text-xs text-[var(--color-muted)]">Rol</label>
        <select
          value={searchParams.get("role") ?? ""}
          onChange={(e) => pushParams({ role: e.target.value })}
          className={inputClass}
        >
          <option value="">Todos</option>
          {SELECTABLE_ROLES.map((r) => (
            <option key={r} value={r}>
              {roleLabel(r)}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-xs text-[var(--color-muted)]">
          Elo mínimo
        </label>
        <select
          value={searchParams.get("minElo") ?? ""}
          onChange={(e) => pushParams({ minElo: e.target.value })}
          className={inputClass}
        >
          <option value="">Cualquiera</option>
          {ELO_ORDER.map((e) => (
            <option key={e} value={e}>
              {ELO_LABELS[e]} o superior
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-end">
        {hasFilters && (
          <button
            type="button"
            onClick={() => startTransition(() => router.push("/tablon"))}
            className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors disabled:opacity-50"
            disabled={isPending}
          >
            {isPending ? "Filtrando…" : "Limpiar filtros"}
          </button>
        )}
      </div>
    </div>
  );
}
