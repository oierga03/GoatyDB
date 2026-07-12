/**
 * Derivación de roles a partir de las partidas importadas. Solo las capturas en
 * "vista avanzada" traen posición; las normales quedan UNKNOWN y no cuentan.
 *
 * Rellena:
 *   - `Player.primaryRole`    → posición MÁS jugada por el jugador (global).
 *   - `RosterMembership.role` → posición MÁS jugada por ese jugador EN ESE equipo
 *                               y split. Es el campo que usan las fichas y el
 *                               filtro del buscador de jugadores.
 *
 * Vive aparte porque lo usan dos sitios: el script `db:roles` y el propio
 * importador (que reescribe `RosterMembership.role` con lo que venga en
 * rosters.csv —vacío—, así que tiene que rederivarlos al terminar).
 */
import type { PrismaClient } from "@prisma/client";
import { PlayerRole } from "@prisma/client";
import { ROLE_ORDER } from "../src/lib/labels";

type Counts = Map<PlayerRole, number>;

function bump(map: Map<string, Counts>, key: string, role: PlayerRole) {
  let c = map.get(key);
  if (!c) map.set(key, (c = new Map()));
  c.set(role, (c.get(role) ?? 0) + 1);
}

/// Posición más jugada. Empate → orden canónico (Top→Support) para ser estable.
function pick(counts: Counts): PlayerRole {
  let best: PlayerRole | null = null;
  let bestGames = -1;
  for (const [role, games] of counts) {
    const better =
      games > bestGames ||
      (games === bestGames &&
        ROLE_ORDER.indexOf(role) < ROLE_ORDER.indexOf(best as PlayerRole));
    if (better) {
      best = role;
      bestGames = games;
    }
  }
  return best as PlayerRole;
}

export type RolesSummary = {
  playersWithRole: number;
  totalPlayers: number;
  membershipsWithRole: number;
  totalMemberships: number;
  updatedPlayers: number;
  updatedMemberships: number;
  noEvidence: number;
  deduced: number;
};

const LANES: PlayerRole[] = [
  PlayerRole.TOP,
  PlayerRole.JUNGLE,
  PlayerRole.MID,
  PlayerRole.ADC,
  PlayerRole.SUPPORT,
];

export async function deriveRoles(prisma: PrismaClient): Promise<RolesSummary> {
  // --- Evidencia directa: la posición que traen las capturas avanzadas -------
  const stats = await prisma.playerGameStat.findMany({
    where: { position: { not: PlayerRole.UNKNOWN } },
    select: {
      playerId: true,
      teamId: true,
      position: true,
      game: { select: { match: { select: { splitId: true } } } },
    },
  });

  const byPlayer = new Map<string, Counts>();
  const byEntry = new Map<string, Counts>();
  for (const s of stats) {
    bump(byPlayer, s.playerId, s.position);
    bump(byEntry, `${s.playerId}|${s.teamId}|${s.game.match.splitId}`, s.position);
  }

  // --- Deducción "4 de 5" ---------------------------------------------------
  // En una alineación hay 5 puestos distintos. Si conocemos 4 y son diferentes,
  // el quinto SOLO puede ser el que falta: no es adivinar, es descartar. Se
  // itera porque cada deducción puede desbloquear otra.
  const deducedRole = new Map<string, PlayerRole>(); // playerId -> rol deducido
  const deducedEntry = new Map<string, PlayerRole>(); // playerId|teamId|splitId

  const all = await prisma.playerGameStat.findMany({
    select: {
      gameId: true,
      teamId: true,
      playerId: true,
      game: { select: { match: { select: { splitId: true } } } },
    },
  });

  type Slot = { playerId: string; teamId: string; splitId: string };
  const lineups = new Map<string, Slot[]>();
  for (const s of all) {
    const key = `${s.gameId}|${s.teamId}`;
    const arr = lineups.get(key) ?? [];
    arr.push({
      playerId: s.playerId,
      teamId: s.teamId,
      splitId: s.game.match.splitId,
    });
    lineups.set(key, arr);
  }

  const roleFor = (playerId: string): PlayerRole | null => {
    const counts = byPlayer.get(playerId);
    if (counts) return pick(counts);
    return deducedRole.get(playerId) ?? null;
  };

  for (let pass = 0; pass < 5; pass++) {
    let added = 0;
    for (const slots of lineups.values()) {
      if (slots.length !== 5) continue;
      const roles = slots.map((s) => roleFor(s.playerId));
      const missing = roles
        .map((r, i) => (r ? -1 : i))
        .filter((i) => i >= 0);
      if (missing.length !== 1) continue;
      const have = roles.filter((r): r is PlayerRole => r !== null);
      if (new Set(have).size !== 4) continue; // los 4 conocidos deben ser distintos
      const gap = LANES.find((r) => !have.includes(r));
      if (!gap) continue;
      const slot = slots[missing[0]];
      if (deducedRole.has(slot.playerId)) continue;
      deducedRole.set(slot.playerId, gap);
      deducedEntry.set(`${slot.playerId}|${slot.teamId}|${slot.splitId}`, gap);
      added++;
    }
    if (added === 0) break;
  }

  // --- Player.primaryRole -------------------------------------------------
  // La evidencia directa manda; la deducción solo rellena huecos.
  const finalPlayerRole = new Map<string, PlayerRole>();
  for (const [playerId, counts] of byPlayer) {
    finalPlayerRole.set(playerId, pick(counts));
  }
  for (const [playerId, role] of deducedRole) {
    if (!finalPlayerRole.has(playerId)) finalPlayerRole.set(playerId, role);
  }

  const players = await prisma.player.findMany({
    where: { id: { in: [...finalPlayerRole.keys()] } },
    select: { id: true, primaryRole: true },
  });
  let updatedPlayers = 0;
  for (const p of players) {
    const role = finalPlayerRole.get(p.id)!;
    if (p.primaryRole === role) continue;
    await prisma.player.update({ where: { id: p.id }, data: { primaryRole: role } });
    updatedPlayers++;
  }

  // --- RosterMembership.role ---------------------------------------------
  const memberships = await prisma.rosterMembership.findMany({
    select: {
      id: true,
      role: true,
      playerId: true,
      teamEntry: {
        select: {
          teamId: true,
          division: { select: { edition: { select: { splitId: true } } } },
        },
      },
    },
  });
  let updatedMemberships = 0;
  let noEvidence = 0;
  for (const m of memberships) {
    const splitId = m.teamEntry.division.edition.splitId;
    const key = `${m.playerId}|${m.teamEntry.teamId}|${splitId}`;
    const counts = byEntry.get(key);
    // Evidencia directa; si no, la deducción "4 de 5" para ese equipo/split.
    const role = counts ? pick(counts) : deducedEntry.get(key);
    if (!role) {
      noEvidence++; // no jugó (o solo en vistas normales) → lo dejamos UNKNOWN
      continue;
    }
    if (m.role === role) continue;
    await prisma.rosterMembership.update({ where: { id: m.id }, data: { role } });
    updatedMemberships++;
  }

  const [playersWithRole, totalPlayers, membershipsWithRole, totalMemberships] =
    await Promise.all([
      prisma.player.count({ where: { primaryRole: { not: PlayerRole.UNKNOWN } } }),
      prisma.player.count(),
      prisma.rosterMembership.count({
        where: { role: { not: PlayerRole.UNKNOWN } },
      }),
      prisma.rosterMembership.count(),
    ]);

  return {
    playersWithRole,
    totalPlayers,
    membershipsWithRole,
    totalMemberships,
    updatedPlayers,
    updatedMemberships,
    noEvidence,
    deduced: deducedRole.size,
  };
}
