"use client";

import Link from "next/link";
import { useState } from "react";
import { AGE_ORDER, AGE_LABELS, ELO_ORDER, ELO_LABELS, SELECTABLE_ROLES } from "@/lib/free-agents";
import { roleLabel } from "@/lib/labels";

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

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setError("");
    try {
      const res = await fetch("/api/free-agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "No se pudo publicar. Inténtalo de nuevo.");
      setManageUrl(
        data.manageToken
          ? `${window.location.origin}/tablon/gestionar/${data.manageToken}`
          : "",
      );
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
          <Field label="Nick de LoL" required>
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
