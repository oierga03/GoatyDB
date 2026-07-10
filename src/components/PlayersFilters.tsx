"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { PlayerRole } from "@prisma/client";
import { ROLE_ORDER, roleLabel } from "@/lib/labels";

type Option = { value: string; label: string };

export function PlayersFilters({
  teams,
  divisions,
}: {
  teams: Option[];
  divisions: Option[];
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
    params.delete("page"); // cualquier cambio de filtro vuelve a la página 1
    startTransition(() => {
      router.push(`/players?${params.toString()}`);
    });
  }

  const inputClass =
    "w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm outline-none focus:border-[var(--color-accent)] transition-colors";

  return (
    <form
      className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
      onSubmit={(e) => {
        e.preventDefault();
        pushParams({ q });
      }}
    >
      <div className="sm:col-span-2 lg:col-span-1">
        <label className="mb-1 block text-xs text-[var(--color-muted)]">
          Buscar por nick
        </label>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Ej. Oier"
          className={inputClass}
        />
      </div>

      <div>
        <label className="mb-1 block text-xs text-[var(--color-muted)]">Rol</label>
        <select
          value={searchParams.get("role") ?? ""}
          onChange={(e) => pushParams({ role: e.target.value })}
          className={inputClass}
        >
          <option value="">Todos</option>
          {ROLE_ORDER.filter((r) => r !== PlayerRole.UNKNOWN).map((r) => (
            <option key={r} value={r}>
              {roleLabel(r)}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-xs text-[var(--color-muted)]">
          Equipo
        </label>
        <select
          value={searchParams.get("team") ?? ""}
          onChange={(e) => pushParams({ team: e.target.value })}
          className={inputClass}
        >
          <option value="">Todos</option>
          {teams.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-xs text-[var(--color-muted)]">
          División
        </label>
        <select
          value={searchParams.get("division") ?? ""}
          onChange={(e) => pushParams({ division: e.target.value })}
          className={inputClass}
        >
          <option value="">Todas</option>
          {divisions.map((d) => (
            <option key={d.value} value={d.value}>
              {d.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-4">
        <button
          type="submit"
          className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-black hover:opacity-90 transition-opacity disabled:opacity-50"
          disabled={isPending}
        >
          {isPending ? "Filtrando…" : "Buscar"}
        </button>
        <button
          type="button"
          onClick={() => {
            setQ("");
            startTransition(() => router.push("/players"));
          }}
          className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors"
        >
          Limpiar
        </button>
      </div>
    </form>
  );
}
