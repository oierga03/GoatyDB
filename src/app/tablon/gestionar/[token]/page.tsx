import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { FreeAgentManage } from "@/components/FreeAgentManage";
import { RoleIcon } from "@/components/RoleIcon";
import { roleLabel } from "@/lib/labels";
import { ageLabel, daysLeft, eloLabel } from "@/lib/free-agents";

// El enlace lleva un token secreto: que no acabe en Google ni en un buscador.
export const metadata: Metadata = {
  title: "Gestionar mi anuncio",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const STATUS_TEXT: Record<string, string> = {
  PUBLISHED: "Visible en el tablón",
  FILLED: "Retirado — ya tienes equipo",
  HIDDEN: "Retirado por moderación",
};

export default async function GestionarAnuncioPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const ad = await prisma.freeAgent.findUnique({
    where: { manageToken: token },
  });
  if (!ad) notFound();

  const left = daysLeft(ad.expiresAt);
  const expired = left === 0;

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header>
        <Link
          href="/tablon"
          className="text-sm text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors"
        >
          ← Volver al tablón
        </Link>
        <h1 className="mt-2 text-3xl font-bold">Tu anuncio</h1>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          Esta página es solo tuya: el enlace es la llave. No la compartas.
        </p>
      </header>

      <section className="card p-5">
        <div className="flex flex-wrap items-center gap-2">
          <RoleIcon role={ad.role} size={20} />
          <span className="text-lg font-semibold">{ad.lolNick}</span>
          <span className="text-sm text-[var(--color-muted)]">
            {roleLabel(ad.role)}
            {ad.secondaryRole && ` · ${roleLabel(ad.secondaryRole)}`}
          </span>
        </div>

        <dl className="mt-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          <div className="flex justify-between gap-4 border-b border-[var(--color-border)] py-1.5">
            <dt className="text-[var(--color-muted)]">Estado</dt>
            <dd className="text-right font-medium">
              {expired && ad.status === "PUBLISHED"
                ? "Caducado"
                : STATUS_TEXT[ad.status]}
            </dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-[var(--color-border)] py-1.5">
            <dt className="text-[var(--color-muted)]">Caduca</dt>
            <dd className="text-right font-medium">
              {expired ? "Ya caducó" : `En ${left} día${left === 1 ? "" : "s"}`}
            </dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-[var(--color-border)] py-1.5">
            <dt className="text-[var(--color-muted)]">Elo</dt>
            <dd className="text-right font-medium">
              {eloLabel(ad.currentElo)}
              {ad.peakElo && ` · peak ${eloLabel(ad.peakElo)}`}
            </dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-[var(--color-border)] py-1.5">
            <dt className="text-[var(--color-muted)]">Edad</dt>
            <dd className="text-right font-medium">{ageLabel(ad.ageBracket)} años</dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-[var(--color-border)] py-1.5 sm:col-span-2">
            <dt className="text-[var(--color-muted)]">Discord</dt>
            <dd className="text-right font-mono">{ad.discord}</dd>
          </div>
          <div className="flex justify-between gap-4 py-1.5 sm:col-span-2">
            <dt className="text-[var(--color-muted)]">Disponibilidad</dt>
            <dd className="text-right">{ad.availability}</dd>
          </div>
        </dl>

        {ad.about && (
          <p className="mt-3 border-t border-[var(--color-border)] pt-3 text-sm text-[var(--color-muted)]">
            {ad.about}
          </p>
        )}
      </section>

      {expired && ad.status === "PUBLISHED" && (
        <p className="rounded-lg bg-amber-600/10 px-4 py-3 text-sm text-amber-800 ring-1 ring-inset ring-amber-600/30">
          Tu anuncio ha caducado y ya no se ve en el tablón. Si sigues buscando,
          renuévalo y vuelve a aparecer.
        </p>
      )}

      <FreeAgentManage token={token} />

      <p className="text-xs text-[var(--color-muted)]">
        ¿Necesitas cambiar algún dato? Bórralo y publica uno nuevo: es más rápido
        que cualquier formulario de edición.
      </p>
    </div>
  );
}
