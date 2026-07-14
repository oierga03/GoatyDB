"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Action = "renew" | "filled" | "delete";

/// Los tres botones del enlace de gestión. El token ES la credencial, así que
/// quien llega aquí ya está autorizado: lo único que protegemos es el borrado,
/// que pide confirmación porque no tiene vuelta atrás.
export function FreeAgentManage({ token }: { token: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<Action | null>(null);
  const [error, setError] = useState("");
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [done, setDone] = useState<Action | null>(null);

  async function run(action: Action) {
    setBusy(action);
    setError("");
    try {
      const res = await fetch(`/api/free-agents/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "No se pudo hacer. Inténtalo de nuevo.");
      setDone(action);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
      setConfirmingDelete(false);
    }
  }

  if (done === "delete") {
    return (
      <div className="card p-6 text-center">
        <p className="text-2xl" aria-hidden>
          👋
        </p>
        <p className="mt-2 font-semibold">Anuncio borrado</p>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          Ya no aparece en el tablón. Suerte con el equipo.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {done && (
        <p className="rounded-lg bg-emerald-600/10 px-4 py-3 text-sm text-emerald-800 ring-1 ring-inset ring-emerald-600/30">
          {done === "renew"
            ? "✓ Renovado. Tu anuncio vuelve a estar arriba otros 30 días."
            : "✓ Marcado como «ya tengo equipo». Tu anuncio ya no se muestra."}
        </p>
      )}
      {error && (
        <p className="rounded-lg bg-rose-600/10 px-4 py-3 text-sm text-rose-800 ring-1 ring-inset ring-rose-500/30">
          {error}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <button
          type="button"
          onClick={() => run("renew")}
          disabled={busy !== null}
          className="card card-hover p-4 text-left disabled:opacity-50"
        >
          <span className="block text-sm font-semibold">Sigo buscando</span>
          <span className="mt-1 block text-xs text-[var(--color-muted)]">
            Renueva el anuncio otros 30 días.
          </span>
        </button>

        <button
          type="button"
          onClick={() => run("filled")}
          disabled={busy !== null}
          className="card card-hover p-4 text-left disabled:opacity-50"
        >
          <span className="block text-sm font-semibold">Ya tengo equipo</span>
          <span className="mt-1 block text-xs text-[var(--color-muted)]">
            Lo retira del tablón, pero lo guardamos por si vuelves.
          </span>
        </button>

        <button
          type="button"
          onClick={() => (confirmingDelete ? run("delete") : setConfirmingDelete(true))}
          disabled={busy !== null}
          className={`card p-4 text-left transition-colors disabled:opacity-50 ${
            confirmingDelete
              ? "ring-2 ring-inset ring-rose-500/60"
              : "card-hover"
          }`}
        >
          <span
            className={`block text-sm font-semibold ${
              confirmingDelete ? "text-rose-700" : ""
            }`}
          >
            {confirmingDelete ? "¿Seguro? Pulsa otra vez" : "Borrar del todo"}
          </span>
          <span className="mt-1 block text-xs text-[var(--color-muted)]">
            {confirmingDelete
              ? "Esto no se puede deshacer."
              : "Elimina tus datos por completo."}
          </span>
        </button>
      </div>
    </div>
  );
}
