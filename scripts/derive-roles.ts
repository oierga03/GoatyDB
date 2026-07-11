/**
 * Deriva los roles a partir de las partidas ya importadas. Solo las capturas en
 * "vista avanzada" traen posición; las normales quedan UNKNOWN y no cuentan.
 *
 * Rellena dos cosas:
 *   - `Player.primaryRole`        → posición MÁS jugada por el jugador (global).
 *   - `RosterMembership.role`     → posición MÁS jugada por ese jugador EN ESE
 *                                   equipo y split (más preciso; es el campo que
 *                                   usan las fichas y el filtro del buscador).
 *
 * Es idempotente. IMPORTANTE: el importador reescribe `RosterMembership.role`
 * con lo que venga en rosters.csv (vacío), así que hay que volver a ejecutarlo
 * DESPUÉS de cada `db:import`:
 *
 *   npm run db:roles
 */
import { PrismaClient, PlayerRole } from "@prisma/client";
import { ROLE_ORDER } from "../src/lib/labels";

const prisma = new PrismaClient();

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

async function main() {
  console.log("🎯  Derivando roles desde las posiciones de las partidas…");

  const stats = await prisma.playerGameStat.findMany({
    where: { position: { not: PlayerRole.UNKNOWN } },
    select: {
      playerId: true,
      teamId: true,
      position: true,
      game: { select: { match: { select: { splitId: true } } } },
    },
  });

  // Global por jugador, y por (jugador, equipo, split) para cada participación.
  const byPlayer = new Map<string, Counts>();
  const byEntry = new Map<string, Counts>();
  for (const s of stats) {
    bump(byPlayer, s.playerId, s.position);
    bump(byEntry, `${s.playerId}|${s.teamId}|${s.game.match.splitId}`, s.position);
  }

  // --- Player.primaryRole -------------------------------------------------
  const players = await prisma.player.findMany({
    where: { id: { in: [...byPlayer.keys()] } },
    select: { id: true, primaryRole: true },
  });
  let updatedPlayers = 0;
  for (const p of players) {
    const role = pick(byPlayer.get(p.id)!);
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
    const counts = byEntry.get(`${m.playerId}|${m.teamEntry.teamId}|${splitId}`);
    if (!counts) {
      noEvidence++; // no jugó (o solo en vistas normales) → lo dejamos UNKNOWN
      continue;
    }
    const role = pick(counts);
    if (m.role === role) continue;
    await prisma.rosterMembership.update({ where: { id: m.id }, data: { role } });
    updatedMemberships++;
  }

  const playersWithRole = await prisma.player.count({
    where: { primaryRole: { not: PlayerRole.UNKNOWN } },
  });
  const totalPlayers = await prisma.player.count();
  const membershipsWithRole = await prisma.rosterMembership.count({
    where: { role: { not: PlayerRole.UNKNOWN } },
  });
  const totalMemberships = await prisma.rosterMembership.count();

  console.log(
    `✅  Player.primaryRole: ${playersWithRole}/${totalPlayers} con rol (actualizados: ${updatedPlayers})`,
  );
  console.log(
    `✅  RosterMembership.role: ${membershipsWithRole}/${totalMemberships} con rol (actualizados: ${updatedMemberships})`,
  );
  console.log(
    `    ${noEvidence} participaciones sin evidencia en partidas → siguen UNKNOWN`,
  );
}

main()
  .catch((e) => {
    console.error("❌", (e as Error).message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
