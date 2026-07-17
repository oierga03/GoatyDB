import { PlayerRole, RosterStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// ---------------------------------------------------------------------------
// Historial de plantillas a partir de las partidas
//
// Un jugador autocreado desde un marcador tiene partidas pero no plantilla, así
// que no aparece en el roster de su equipo ni en su historial competitivo. Como
// SABEMOS que jugó ahí (lo dicen sus partidas), le creamos la membresía que
// falta: es un hecho verificado, no una suposición.
// ---------------------------------------------------------------------------

/// Crea las líneas de plantilla que le falten a un jugador según los equipos y
/// splits en los que tiene partidas. Devuelve cuántas creó.
export async function syncTeamHistory(playerId: string): Promise<number> {
  const [player, stats, memberships] = await Promise.all([
    prisma.player.findUnique({ where: { id: playerId }, select: { primaryRole: true } }),
    prisma.playerGameStat.findMany({
      where: { playerId },
      select: { teamId: true, position: true, game: { select: { match: { select: { divisionId: true } } } } },
    }),
    prisma.rosterMembership.findMany({ where: { playerId }, select: { teamEntryId: true } }),
  ]);
  if (!player) return 0;

  // Agrupar sus partidas por (equipo, división) → es la clave de una TeamEntry.
  const groups = new Map<string, { teamId: string; divisionId: string; positions: PlayerRole[] }>();
  for (const s of stats) {
    const key = `${s.teamId}|${s.game.match.divisionId}`;
    const g = groups.get(key) ?? { teamId: s.teamId, divisionId: s.game.match.divisionId, positions: [] };
    if (s.position !== PlayerRole.UNKNOWN) g.positions.push(s.position);
    groups.set(key, g);
  }

  const have = new Set(memberships.map((m) => m.teamEntryId));
  let created = 0;

  for (const g of groups.values()) {
    const entry = await prisma.teamEntry.findUnique({
      where: { teamId_divisionId: { teamId: g.teamId, divisionId: g.divisionId } },
      select: { id: true },
    });
    if (!entry || have.has(entry.id)) continue;

    // Rol de esa etapa: su posición más repetida ahí; si no hay dato, su rol
    // principal conocido.
    const counts = new Map<PlayerRole, number>();
    for (const p of g.positions) counts.set(p, (counts.get(p) ?? 0) + 1);
    const role =
      [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? player.primaryRole;

    await prisma.rosterMembership.create({
      data: {
        playerId,
        teamEntryId: entry.id,
        role,
        rosterStatus: RosterStatus.STARTER,
        notes: "Añadido desde su participación en partidas.",
      },
    });
    have.add(entry.id);
    created++;
  }

  return created;
}

// ---------------------------------------------------------------------------
// Fusión de jugadores
//
// Un jugador se crea automáticamente (needsReview) cuando un nombre de marcador
// no se pudo vincular a una plantilla. Al revisarlos aparecen varios casos:
//  - la misma persona partida en varias fichas → fusionar entre sí.
//  - un nick de marcador que es alguien de la plantilla → reasignar.
//  - la misma persona en equipos distintos en cada split → unir las fichas.
// Todos son la misma operación: mover todo lo de unas fichas a otra y borrar
// las de origen, sin perder plantillas, alias ni identidad.
// ---------------------------------------------------------------------------

export type MergeResult = { reassigned: number; deleted: number; sources: number };

/// Mueve todo lo de `sourceIds` a `targetId` y borra las fichas de origen.
///
/// - Partidas y plantillas: se reasignan; si el destino ya tiene esa partida o
///   esa plantilla, la del origen se descarta (no puede duplicarse).
/// - Riot ID / OP.GG / rol: se trasladan al destino solo si a este le faltan,
///   así da igual en qué dirección se fusione.
/// - El nick de cada origen queda como alias del destino, para que ese mismo
///   nombre en un marcador futuro se resuelva solo.
export async function mergePlayers(
  sourceIds: string[],
  targetId: string,
): Promise<MergeResult> {
  const sources = sourceIds.filter((id) => id && id !== targetId);
  if (sources.length === 0) return { reassigned: 0, deleted: 0, sources: 0 };

  const target = await prisma.player.findUnique({
    where: { id: targetId },
    select: {
      id: true,
      displayName: true,
      riotId: true,
      opggUrl: true,
      primaryRole: true,
      gameStats: { select: { gameId: true } },
      rosterMemberships: { select: { teamEntryId: true } },
      aliases: { select: { alias: true } },
    },
  });
  if (!target) throw new Error("El jugador destino no existe.");

  const targetGames = new Set(target.gameStats.map((g) => g.gameId));
  const targetEntries = new Set(target.rosterMemberships.map((m) => m.teamEntryId));
  const targetName = target.displayName.trim().toLowerCase();
  const targetAliases = new Set(target.aliases.map((a) => a.alias.trim().toLowerCase()));
  const backfill: { riotId?: string; opggUrl?: string; primaryRole?: PlayerRole } = {};

  let reassigned = 0;
  let deleted = 0;

  for (const sid of sources) {
    const src = await prisma.player.findUnique({
      where: { id: sid },
      select: {
        id: true,
        displayName: true,
        riotId: true,
        opggUrl: true,
        primaryRole: true,
        gameStats: { select: { id: true, gameId: true } },
        rosterMemberships: { select: { id: true, teamEntryId: true } },
        aliases: { select: { id: true, alias: true } },
      },
    });
    if (!src) continue;

    // Partidas: reasignar; descartar si el destino ya juega en esa partida.
    for (const g of src.gameStats) {
      if (targetGames.has(g.gameId)) {
        await prisma.playerGameStat.delete({ where: { id: g.id } });
        deleted++;
      } else {
        await prisma.playerGameStat.update({ where: { id: g.id }, data: { playerId: targetId } });
        targetGames.add(g.gameId);
        reassigned++;
      }
    }

    // Plantillas: reasignar; descartar si el destino ya está en ese equipo/edición.
    for (const m of src.rosterMemberships) {
      if (targetEntries.has(m.teamEntryId)) {
        await prisma.rosterMembership.delete({ where: { id: m.id } });
      } else {
        await prisma.rosterMembership.update({ where: { id: m.id }, data: { playerId: targetId } });
        targetEntries.add(m.teamEntryId);
      }
    }

    // Alias: reasignar sin duplicar.
    for (const a of src.aliases) {
      const key = a.alias.trim().toLowerCase();
      if (targetAliases.has(key) || key === targetName) {
        await prisma.playerAlias.delete({ where: { id: a.id } });
      } else {
        await prisma.playerAlias.update({ where: { id: a.id }, data: { playerId: targetId } });
        targetAliases.add(key);
      }
    }

    // Otras referencias.
    await prisma.report.updateMany({ where: { playerId: sid }, data: { playerId: targetId } });
    await prisma.freeAgent.updateMany({ where: { playerId: sid }, data: { playerId: targetId } });

    // Premios: reasignar; descartar si el destino ya tiene esa edición.
    const srcAwards = await prisma.awardRecipient.findMany({ where: { playerId: sid }, select: { id: true, awardEditionId: true } });
    if (srcAwards.length) {
      const targetAwards = new Set(
        (await prisma.awardRecipient.findMany({ where: { playerId: targetId }, select: { awardEditionId: true } })).map((a) => a.awardEditionId),
      );
      for (const aw of srcAwards) {
        if (targetAwards.has(aw.awardEditionId)) await prisma.awardRecipient.delete({ where: { id: aw.id } });
        else {
          await prisma.awardRecipient.update({ where: { id: aw.id }, data: { playerId: targetId } });
          targetAwards.add(aw.awardEditionId);
        }
      }
    }

    // Trasladar identidad al destino si le falta (dirección-agnóstico).
    if (!target.riotId && !backfill.riotId && src.riotId) backfill.riotId = src.riotId;
    if (!target.opggUrl && !backfill.opggUrl && src.opggUrl) backfill.opggUrl = src.opggUrl;
    if (target.primaryRole === PlayerRole.UNKNOWN && !backfill.primaryRole && src.primaryRole !== PlayerRole.UNKNOWN)
      backfill.primaryRole = src.primaryRole;

    // El nombre del origen, como alias del destino.
    const srcName = src.displayName.trim();
    const srcKey = srcName.toLowerCase();
    if (srcName && srcKey !== targetName && !targetAliases.has(srcKey)) {
      await prisma.playerAlias.create({ data: { playerId: targetId, alias: srcName } });
      targetAliases.add(srcKey);
    }

    await prisma.player.delete({ where: { id: sid } });
  }

  if (Object.keys(backfill).length) {
    await prisma.player.update({ where: { id: targetId }, data: backfill });
  }

  // El destino puede haber heredado partidas de equipos en los que aún no
  // figuraba en plantilla: completamos su historial.
  await syncTeamHistory(targetId);

  return { reassigned, deleted, sources: sources.length };
}
