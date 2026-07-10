"use client";

import { useEffect, useState } from "react";

type Kind = "PLAYER_IDENTITY" | "PLAYER_ROLE" | "MATCH_DATA" | "TEAM_DATA" | "OTHER";

const KIND_OPTIONS: { value: Kind; label: string }[] = [
  { value: "PLAYER_IDENTITY", label: "Este jugador es en realidad otra persona / cuenta duplicada" },
  { value: "PLAYER_ROLE", label: "El rol/posición está mal" },
  { value: "MATCH_DATA", label: "El resultado o el marcador está mal" },
  { value: "TEAM_DATA", label: "Datos del equipo o roster incorrectos" },
  { value: "OTHER", label: "Otra cosa" },
];

/**
 * Botón + modal para que la comunidad reporte un dato incorrecto.
 * Se puede asociar a un jugador (`playerId`) o a una partida (`matchId`).
 */
export function ReportDialog({
  playerId,
  matchId,
  subject,
  defaultKind = "OTHER",
  label = "Reportar dato incorrecto",
}: {
  playerId?: string;
  matchId?: string;
  subject?: string;
  defaultKind?: Kind;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<Kind>(defaultKind);
  const [message, setMessage] = useState("");
  const [contact, setContact] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setError("");
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, message, contact, subject, playerId, matchId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "No se pudo enviar. Inténtalo de nuevo.");
      }
      setStatus("done");
    } catch (err) {
      setStatus("error");
      setError((err as Error).message);
    }
  }

  function reset() {
    setOpen(false);
    setTimeout(() => {
      setStatus("idle");
      setMessage("");
      setContact("");
      setKind(defaultKind);
      setError("");
    }, 200);
  }

  const inputClass =
    "w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm outline-none focus:border-[var(--color-accent)] transition-colors";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-xs text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors"
      >
        <span aria-hidden>⚑</span>
        {label}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={reset}
        >
          <div
            className="card w-full max-w-lg p-5"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            {status === "done" ? (
              <div className="space-y-4 text-center">
                <p className="text-2xl" aria-hidden>
                  ✅
                </p>
                <h2 className="text-lg font-semibold">¡Gracias!</h2>
                <p className="text-sm text-[var(--color-muted)]">
                  Hemos recibido tu aviso. Lo revisaremos y corregiremos si procede.
                </p>
                <button
                  type="button"
                  onClick={reset}
                  className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-black hover:opacity-90 transition-opacity"
                >
                  Cerrar
                </button>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold">Reportar un dato</h2>
                    {subject && (
                      <p className="text-xs text-[var(--color-muted)]">Sobre: {subject}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={reset}
                    className="text-[var(--color-muted)] hover:text-[var(--color-text)]"
                    aria-label="Cerrar"
                  >
                    ✕
                  </button>
                </div>

                <div>
                  <label className="mb-1 block text-xs text-[var(--color-muted)]">
                    ¿Qué está mal?
                  </label>
                  <select
                    value={kind}
                    onChange={(e) => setKind(e.target.value as Kind)}
                    className={inputClass}
                  >
                    {KIND_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs text-[var(--color-muted)]">
                    Cuéntanos la corrección
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={4}
                    placeholder="Ej. 'galena2134' es en realidad la cuenta de fading echoes (Chompy)."
                    className={inputClass}
                    required
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs text-[var(--color-muted)]">
                    Contacto (opcional)
                  </label>
                  <input
                    type="text"
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    placeholder="Discord o email por si necesitamos confirmarlo"
                    className={inputClass}
                  />
                </div>

                {status === "error" && (
                  <p className="text-sm text-red-300">{error}</p>
                )}

                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={reset}
                    className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={status === "sending"}
                    className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-black hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {status === "sending" ? "Enviando…" : "Enviar"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
