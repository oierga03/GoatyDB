"use client";

import { useState } from "react";

/// El Discord NO se le pasa a este componente: se pide al servidor al pulsar.
///
/// Es a propósito. Si viniera como prop, Next lo serializaría en el HTML de
/// /tablon y un solo `curl` bastaría para llevarse el contacto de todos los
/// jugadores del tablón. Así hay que pedirlos uno a uno.
export function DiscordReveal({ adId }: { adId: string }) {
  const [discord, setDiscord] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  async function reveal() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/free-agents/contacto?id=${encodeURIComponent(adId)}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "No se pudo cargar.");
      setDiscord(data.discord);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(discord);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* Sin portapapeles: el nick ya está a la vista, se copia a mano. */
    }
  }

  if (error) {
    return <span className="text-xs text-rose-700">{error}</span>;
  }

  if (!discord) {
    return (
      <button
        type="button"
        onClick={reveal}
        disabled={loading}
        className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-accent)] px-3 py-1.5 text-xs font-semibold text-black hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        <span aria-hidden>💬</span>
        {loading ? "Cargando…" : "Ver Discord"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={copy}
      title="Copiar"
      className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-surface-2)] px-3 py-1.5 font-mono text-xs ring-1 ring-inset ring-[var(--color-border)] hover:ring-[var(--color-accent)] transition-colors"
    >
      <span aria-hidden>💬</span>
      {discord}
      <span className="text-[var(--color-muted)]">{copied ? "✓" : "⧉"}</span>
    </button>
  );
}
