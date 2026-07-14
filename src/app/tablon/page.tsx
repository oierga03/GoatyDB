import type { Metadata } from "next";
import Link from "next/link";
import { EloTier, PlayerRole, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { EmptyState } from "@/components/EmptyState";
import { RoleIcon } from "@/components/RoleIcon";
import { ReportDialog } from "@/components/ReportDialog";
import { DiscordReveal } from "@/components/DiscordReveal";
import { FreeAgentFilters } from "@/components/FreeAgentFilters";
import { VerifiedRecord } from "@/components/VerifiedRecord";
import { getPlayerRecords } from "@/lib/player-record";
import { roleLabel } from "@/lib/labels";
import {
  ageLabel,
  daysLeft,
  ELO_BADGE_CLASS,
  ELO_ORDER,
  eloLabel,
  SELECTABLE_ROLES,
} from "@/lib/free-agents";

export const metadata: Metadata = {
  title: "Tablón · Busco equipo",
  description:
    "Jugadores de Hextech que buscan equipo: rol, elo, disponibilidad y contacto. Apúntate gratis.",
};

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ role?: string; minElo?: string }>;

async function getAds(role?: string, minElo?: string) {
  const where: Prisma.FreeAgentWhereInput = {
    status: "PUBLISHED",
    expiresAt: { gt: new Date() },
  };

  if (role && SELECTABLE_ROLES.includes(role as PlayerRole)) {
    // "Busco un top" también debe encontrar al mid que puede hacer de top.
    where.OR = [{ role: role as PlayerRole }, { secondaryRole: role as PlayerRole }];
  }

  if (minElo && ELO_ORDER.includes(minElo as EloTier)) {
    const from = ELO_ORDER.indexOf(minElo as EloTier);
    where.currentElo = { in: ELO_ORDER.slice(from) };
  }

  // `select` explícito, no `include`: así el `manageToken` (que es la credencial
  // para borrar un anuncio), el hash de IP y el Discord no llegan siquiera a
  // esta página. Lo que no se trae no se puede filtrar por accidente.
  return prisma.freeAgent.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      lolNick: true,
      role: true,
      secondaryRole: true,
      currentElo: true,
      peakElo: true,
      ageBracket: true,
      availability: true,
      about: true,
      opggUrl: true,
      expiresAt: true,
      playerId: true,
    },
    take: 200,
  });
}

export default async function TablonPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { role, minElo } = await searchParams;
  const ads = await getAds(role, minElo);

  // El historial verificado de los que ya están en la base de datos, en una
  // sola consulta para todos.
  const records = await getPlayerRecords(
    ads.map((a) => a.playerId).filter((id): id is string => Boolean(id)),
  );

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Busco equipo</h1>
          <p className="mt-1 max-w-2xl text-sm text-[var(--color-muted)]">
            El tablón de la Hextech. Si te has quedado sin equipo, apúntate y que
            te encuentren. Si eres capitán y te falta gente, aquí la tienes.
          </p>
        </div>
        <Link
          href="/tablon/nuevo"
          className="rounded-lg bg-[var(--color-accent)] px-4 py-2.5 text-sm font-semibold text-black hover:opacity-90 transition-opacity"
        >
          Apúntate al tablón
        </Link>
      </header>

      {/* La web entera promete dato verificado. Esta página es la excepción y
          hay que decirlo bien claro, o se lleva por delante esa promesa. */}
      <div className="rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-xs leading-relaxed text-[var(--color-muted)]">
        <span className="font-semibold text-[var(--color-text)]">
          Ojo: esto lo escribe cada jugador sobre sí mismo.
        </span>{" "}
        A diferencia del resto de GoatyDB, el elo y los datos de este tablón{" "}
        <span className="text-[var(--color-text)]">no están verificados</span>. Por
        eso pedimos el OP.GG: compruébalo tú de un clic. Si un jugador tiene ficha
        en la base de datos, te la enlazamos — sus partidas reales valen más que
        cualquier rango que diga tener.
      </div>

      <FreeAgentFilters />

      <p className="text-sm text-[var(--color-muted)]">
        {ads.length} jugador{ads.length === 1 ? "" : "es"} buscando equipo
      </p>

      {ads.length === 0 ? (
        <EmptyState
          icon="🐐"
          title="Nadie buscando equipo ahora mismo"
          description="Sé el primero: publicar tu anuncio te lleva un minuto y no hace falta ni registrarse."
        />
      ) : (
        <ul className="space-y-3">
          {ads.map((ad) => {
            const left = daysLeft(ad.expiresAt);
            const record = ad.playerId ? records.get(ad.playerId) : null;
            return (
              <li key={ad.id} className="card card-hover p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    {/* Identidad + rol */}
                    <div className="flex flex-wrap items-center gap-2">
                      <RoleIcon role={ad.role} size={20} />
                      <span className="text-lg font-semibold">{ad.lolNick}</span>
                      <span className="text-sm text-[var(--color-muted)]">
                        {roleLabel(ad.role)}
                        {ad.secondaryRole && ` · ${roleLabel(ad.secondaryRole)}`}
                      </span>
                    </div>

                    {/* Elo — autodeclarado, con el OP.GG al lado para comprobarlo */}
                    <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs">
                      {ad.currentElo && (
                        <span className={`badge ${ELO_BADGE_CLASS[ad.currentElo]}`}>
                          {eloLabel(ad.currentElo)}
                        </span>
                      )}
                      {ad.peakElo && (
                        <span className="text-[var(--color-muted)]">
                          Peak {eloLabel(ad.peakElo)}
                        </span>
                      )}
                      <span className="text-[var(--color-muted)]">
                        {ageLabel(ad.ageBracket)} años
                      </span>
                      {ad.opggUrl && (
                        <a
                          href={ad.opggUrl}
                          target="_blank"
                          rel="noopener noreferrer nofollow"
                          className="text-[var(--color-accent)] hover:underline"
                        >
                          Comprobar en OP.GG ↗
                        </a>
                      )}
                    </div>

                    <p className="mt-2 text-sm">
                      <span className="text-[var(--color-muted)]">Disponible:</span>{" "}
                      {ad.availability}
                    </p>
                    {ad.about && (
                      <p className="mt-1.5 text-sm text-[var(--color-muted)]">
                        {ad.about}
                      </p>
                    )}

                    {/* Lo que el jugador dice, arriba. Lo que sabemos, aquí. */}
                    {record && <VerifiedRecord record={record} />}
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <DiscordReveal adId={ad.id} />
                    <span className="text-[10px] text-[var(--color-muted)]">
                      {left === 0
                        ? "Caduca hoy"
                        : `Caduca en ${left} día${left === 1 ? "" : "s"}`}
                    </span>
                    <ReportDialog
                      freeAgentId={ad.id}
                      subject={`Anuncio de ${ad.lolNick}`}
                      defaultKind="FREE_AGENT"
                      label="Reportar"
                    />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
