"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AGE_ORDER, AGE_LABELS, ELO_ORDER, ELO_LABELS, SELECTABLE_ROLES } from "@/lib/free-agents";
import { roleLabel } from "@/lib/labels";
import { addMyAd } from "@/lib/my-ads";
import type { PlayerRecord } from "@/lib/player-record";

const INPUT =
  "w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm outline-none focus:border-[var(--color-accent)] transition-colors";

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs text-[var(--color-muted)]">
        {label}
        {required && <span className="ml-0.5 text-[var(--color-accent)]">*</span>}
      </label>
      {children}
      {hint && <p className="mt-1 text-[11px] text-[var(--color-muted)]">{hint}</p>}
    </div>
  );
}

/// Resumen de una persona de la base de datos: equipo, división y sus partidas
/// reales. Lo que distingue a dos jugadores que comparten nick.
function PlayerSummary({ record }: { record: PlayerRecord }) {
  return (
    <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
      <span className="text-[var(--color-text)]">
        {record.team ? record.team.name : "Sin equipo registrado"}
      </span>
      {record.division && (
        <span className="text-[var(--color-muted)]">
          {record.division}
          {record.split && ` · ${record.split}`}
        </span>
      )}
      {record.stats ? (
        <span className="text-[var(--color-muted)]">
          · {record.stats.games} partida{record.stats.games === 1 ? "" : "s"} ·{" "}
          {record.stats.winrate}% victorias · {record.stats.kda.toFixed(2)} KDA
        </span>
      ) : (
        <span className="text-[var(--color-muted)]">· sin partidas registradas</span>
      )}
    </span>
  );
}

export function FreeAgentForm() {
  const [form, setForm] = useState({
    lolNick: "",
    discord: "",
    opggUrl: "",
    role: "",
    secondaryRole: "",
    currentElo: "",
    peakElo: "",
    ageBracket: "",
    availability: "",
    about: "",
    website: "", // honeypot
  });
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState("");
  const [manageUrl, setManageUrl] = useState("");
  const [copied, setCopied] = useState(false);

  // Si el nick ya está en GoatyDB, no le hacemos teclear lo que ya sabemos.
  //
  // Puede haber VARIOS candidatos: hay nicks que comparten varias personas. En
  // ese caso no elegimos por él — le preguntamos.
  const [candidates, setCandidates] = useState<PlayerRecord[]>([]);
  const [chosenId, setChosenId] = useState<string | null>(null);
  const [looking, setLooking] = useState(false);

  /// Qué campos ha tocado el jugador. En cuanto toca uno, dejamos de pisárselo:
  /// manda él.
  const touched = useRef<Set<string>>(new Set());

  const record = candidates.find((c) => c.id === chosenId) ?? null;

  const set =
    (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      touched.current.add(k);
      setForm((f) => ({ ...f, [k]: e.target.value }));
    };

  /// Rellena rol y OP.GG con lo que ya sabemos, sin pisar lo que él haya puesto.
  function prefillFrom(r: PlayerRecord) {
    setForm((f) => ({
      ...f,
      role:
        touched.current.has("role") || !r.role || r.role === "UNKNOWN" ? f.role : r.role,
      opggUrl: touched.current.has("opggUrl") || !r.opggUrl ? f.opggUrl : r.opggUrl,
    }));
  }

  // Buscamos mientras escribe el nick, con un respiro para no lanzar una
  // petición por tecla.
  useEffect(() => {
    const nick = form.lolNick.trim();
    if (nick.length < 2) {
      setCandidates([]);
      setChosenId(null);
      return;
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      setLooking(true);
      try {
        const res = await fetch(`/api/players/lookup?nick=${encodeURIComponent(nick)}`);
        const data = await res.json();
        if (cancelled) return;
        const found: PlayerRecord[] = data.candidates ?? [];
        setCandidates(found);

        // Uno solo: no hay duda.
        //
        // Varios: si solo UNO está en una plantilla oficial, ese es. Los otros
        // suelen ser duplicados creados desde un marcador (los seis "CG Kille"
        // sin equipo son la misma persona). Aun así puede corregirnos.
        const registered = found.filter((c) => c.registered);
        const pick =
          found.length === 1 ? found[0] : registered.length === 1 ? registered[0] : null;

        if (pick) {
          setChosenId(pick.id);
          prefillFrom(pick);
        } else {
          setChosenId(null);
        }
      } catch {
        if (!cancelled) setCandidates([]); // Si falla, el formulario sigue a mano.
      } finally {
        if (!cancelled) setLooking(false);
      }
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [form.lolNick]);

  function choose(r: PlayerRecord) {
    setChosenId(r.id);
    prefillFrom(r);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setError("");
    try {
      const res = await fetch("/api/free-agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // `playerId` es a quién dice ser; el servidor lo verifica igualmente.
        body: JSON.stringify({ ...form, playerId: chosenId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "No se pudo publicar. Inténtalo de nuevo.");
      if (data.manageToken) {
        setManageUrl(`${window.location.origin}/tablon/gestionar/${data.manageToken}`);
        // Lo recordamos en este navegador para que puedas gestionarlo desde el
        // tablón sin depender de haber guardado el enlace.
        addMyAd({ id: data.id, token: data.manageToken, nick: form.lolNick.trim() });
      } else {
        setManageUrl("");
      }
      setStatus("done");
    } catch (err) {
      setStatus("error");
      setError((err as Error).message);
    }
  }

  async function copyManageUrl() {
    try {
      await navigator.clipboard.writeText(manageUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* Si no hay portapapeles, el enlace está a la vista para copiarlo a mano. */
    }
  }

  if (status === "done") {
    return (
      <div className="card space-y-4 p-6 text-center">
        <p className="text-3xl" aria-hidden>
          🐐
        </p>
        <h2 className="text-xl font-bold">¡Ya estás en el tablón!</h2>
        <p className="text-sm text-[var(--color-muted)]">
          Tu anuncio ya es visible. Caduca a los 30 días para que el tablón no se
          llene de gente que ya tiene equipo.
        </p>

        {manageUrl && (
          <div className="rounded-xl border border-[var(--color-accent)]/40 bg-[var(--color-surface-2)] p-4 text-left">
            <p className="text-sm font-semibold">
              Guarda este enlace. Es el único.
            </p>
            <p className="mt-1 text-xs text-[var(--color-muted)]">
              Es tu llave para renovar el anuncio, marcar que ya tienes equipo o
              borrarlo. No hay contraseñas ni cuentas: si lo pierdes, no podemos
              recuperártelo.
            </p>
            <button
              type="button"
              onClick={copyManageUrl}
              className="mt-3 block w-full break-all rounded-lg bg-[var(--color-surface)] px-3 py-2 text-left font-mono text-xs ring-1 ring-inset ring-[var(--color-border)] hover:ring-[var(--color-accent)] transition-colors"
            >
              {manageUrl}
              <span className="ml-2 text-[var(--color-accent)]">
                {copied ? "✓ copiado" : "⧉ copiar"}
              </span>
            </button>
          </div>
        )}

        <Link
          href="/tablon"
          className="inline-block rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-black hover:opacity-90 transition-opacity"
        >
          Ver el tablón
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <section className="card space-y-4 p-5">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-sky)]">
          Quién eres
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Nick de LoL"
            required
            hint={looking ? "Buscándote en GoatyDB…" : undefined}
          >
            <input
              value={form.lolNick}
              onChange={set("lolNick")}
              placeholder="Ej. Chompy"
              maxLength={40}
              required
              className={INPUT}
            />
          </Field>
          <Field
            label="Discord"
            required
            hint="Es por donde te van a escribir. Sin esto, el anuncio no sirve."
          >
            <input
              value={form.discord}
              onChange={set("discord")}
              placeholder="Ej. chompy_lol"
              maxLength={60}
              required
              className={INPUT}
            />
          </Field>
        </div>
        {/* Uno solo: te hemos reconocido sin lugar a dudas. */}
        {record && (
          <div className="rounded-xl bg-[var(--color-surface-2)] p-4 ring-1 ring-inset ring-[var(--color-sky)]/40">
            <p className="text-sm font-semibold">
              <span aria-hidden>✓</span> Te hemos encontrado en GoatyDB
            </p>
            <p className="mt-1 text-xs text-[var(--color-muted)]">
              <PlayerSummary record={record} />
            </p>
            <p className="mt-2 text-xs text-[var(--color-muted)]">
              Tu anuncio irá enlazado a tu ficha, así que los capitanes verán tus
              partidas de verdad. Hemos rellenado lo que ya sabíamos; cámbialo si
              no cuadra.
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <a
                href={`/players/${record.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-medium text-[var(--color-accent)] hover:underline"
              >
                Ver mi ficha ↗
              </a>
              {candidates.length > 1 && (
                <button
                  type="button"
                  onClick={() => setChosenId(null)}
                  className="text-xs text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors"
                >
                  No soy yo, elegir otro
                </button>
              )}
            </div>
          </div>
        )}

        {/* Varios comparten ese nick. No adivinamos: que elija él. */}
        {!record && candidates.length > 1 && (
          <div className="rounded-xl bg-[var(--color-surface-2)] p-4 ring-1 ring-inset ring-amber-500/40">
            <p className="text-sm font-semibold">
              Hay {candidates.length} jugadores con ese nick. ¿Cuál eres?
            </p>
            <p className="mt-1 text-xs text-[var(--color-muted)]">
              Elige el tuyo y enlazamos tu anuncio con tu ficha. Si no eres
              ninguno, sigue sin más: publicaremos igual, solo que sin enlazar.
            </p>
            <ul className="mt-3 space-y-2">
              {candidates.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => choose(c)}
                    className="w-full rounded-lg bg-[var(--color-surface)] px-3 py-2 text-left text-xs ring-1 ring-inset ring-[var(--color-border)] hover:ring-[var(--color-accent)] transition-colors"
                  >
                    <PlayerSummary record={c} />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <Field
          label="Tramo de edad"
          required
          hint="Solo el tramo: no publicamos edades exactas."
        >
          <select
            value={form.ageBracket}
            onChange={set("ageBracket")}
            required
            className={INPUT}
          >
            <option value="">Elige…</option>
            {AGE_ORDER.map((a) => (
              <option key={a} value={a}>
                {AGE_LABELS[a]} años
              </option>
            ))}
          </select>
        </Field>
      </section>

      <section className="card space-y-4 p-5">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-sky)]">
          A qué juegas
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Rol principal" required>
            <select value={form.role} onChange={set("role")} required className={INPUT}>
              <option value="">Elige…</option>
              {SELECTABLE_ROLES.map((r) => (
                <option key={r} value={r}>
                  {roleLabel(r)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Rol secundario" hint="Opcional. Si eres polivalente, dilo.">
            <select value={form.secondaryRole} onChange={set("secondaryRole")} className={INPUT}>
              <option value="">Ninguno</option>
              {SELECTABLE_ROLES.filter((r) => r !== form.role).map((r) => (
                <option key={r} value={r}>
                  {roleLabel(r)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Elo actual">
            <select value={form.currentElo} onChange={set("currentElo")} className={INPUT}>
              <option value="">Prefiero no decirlo</option>
              {ELO_ORDER.map((e) => (
                <option key={e} value={e}>
                  {ELO_LABELS[e]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Peak">
            <select value={form.peakElo} onChange={set("peakElo")} className={INPUT}>
              <option value="">Prefiero no decirlo</option>
              {ELO_ORDER.map((e) => (
                <option key={e} value={e}>
                  {ELO_LABELS[e]}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field
          label="OP.GG"
          hint="Tu mejor argumento: es lo que hace comprobable el elo que pones. Solo aceptamos enlaces de op.gg."
        >
          <input
            value={form.opggUrl}
            onChange={set("opggUrl")}
            placeholder="https://op.gg/summoners/euw/Chompy-EUW"
            maxLength={300}
            className={INPUT}
          />
        </Field>
      </section>

      <section className="card space-y-4 p-5">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-sky)]">
          Cuándo y qué buscas
        </h2>
        <Field label="Disponibilidad" required hint="Cuándo puedes entrenar y jugar.">
          <input
            value={form.availability}
            onChange={set("availability")}
            placeholder="Ej. Entre semana a partir de las 21h y domingos"
            maxLength={140}
            required
            className={INPUT}
          />
        </Field>
        <Field label="Sobre ti" hint="Opcional, 280 caracteres. Véndete.">
          <textarea
            value={form.about}
            onChange={set("about")}
            rows={3}
            maxLength={280}
            placeholder="Ej. Vengo de jugar División 5. Busco equipo serio para el próximo periodo, con voz y ganas de scrims."
            className={INPUT}
          />
        </Field>
      </section>

      {/* Honeypot: invisible para humanos, irresistible para bots. */}
      <div aria-hidden className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
        <label>
          No rellenar
          <input
            tabIndex={-1}
            autoComplete="off"
            value={form.website}
            onChange={set("website")}
          />
        </label>
      </div>

      {status === "error" && (
        <p className="rounded-lg bg-rose-600/10 px-4 py-3 text-sm text-rose-800 ring-1 ring-inset ring-rose-500/30">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={status === "sending"}
          className="rounded-lg bg-[var(--color-accent)] px-5 py-2.5 text-sm font-semibold text-black hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {status === "sending" ? "Publicando…" : "Publicar anuncio"}
        </button>
        <Link
          href="/tablon"
          className="text-sm text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors"
        >
          Cancelar
        </Link>
      </div>

      <p className="text-xs leading-relaxed text-[var(--color-muted)]">
        Tu anuncio se publica al momento y es{" "}
        <span className="text-[var(--color-text)]">público</span>: cualquiera podrá
        ver tu nick, tu rol, tu elo y tu Discord. No pongas nada que no quieras que
        se vea. Puedes borrarlo cuando quieras desde el enlace que te daremos.
      </p>
    </form>
  );
}
