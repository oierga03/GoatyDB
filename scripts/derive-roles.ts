/**
 * Deriva `Player.primaryRole` a partir de las partidas ya importadas: el rol de
 * un jugador es la posición que MÁS ha jugado en los marcadores (solo las vistas
 * avanzadas traen posición; las normales quedan como UNKNOWN y no cuentan).
 *
 * Es idempotente: se puede volver a ejecutar tras cada import de partidas.
 *
 *   npm run db:roles
 */
import { PrismaClient, PlayerRole } from "@prisma/client";
import { ROLE_ORDER } from "../src/lib/labels";

const prisma = new PrismaClient();

async function main() {
  console.log("🎯  Derivando roles desde las posiciones de las partidas…");

  // Cuántas veces ha jugado cada jugador en cada posición (ignorando UNKNOWN).
  const rows = await prisma.playerGameStat.groupBy({
    by: ["playerId", "position"],
    where: { position: { not: PlayerRole.UNKNOWN } },
    _count: { _all: true },
  });

  // playerId -> posición más jugada (empate: el orden canónico Top→Support).
  const best = new Map<string, { role: PlayerRole; games: number }>();
  for (const r of rows) {
    const games = r._count._all;
    const current = best.get(r.playerId);
    const isBetter =
      !current ||
      games > current.games ||
      (games === current.games &&
        ROLE_ORDER.indexOf(r.position) < ROLE_ORDER.indexOf(current.role));
    if (isBetter) best.set(r.playerId, { role: r.position, games });
  }

  // Solo escribimos si cambia, para no tocar filas de más.
  const players = await prisma.player.findMany({
    where: { id: { in: [...best.keys()] } },
    select: { id: true, displayName: true, primaryRole: true },
  });

  let updated = 0;
  for (const p of players) {
    const role = best.get(p.id)!.role;
    if (p.primaryRole === role) continue;
    await prisma.player.update({ where: { id: p.id }, data: { primaryRole: role } });
    updated++;
  }

  const withRole = await prisma.player.count({
    where: { primaryRole: { not: PlayerRole.UNKNOWN } },
  });
  const total = await prisma.player.count();
  console.log(
    `✅  Jugadores con posición en partidas: ${best.size} · actualizados: ${updated}`,
  );
  console.log(
    `    Total con rol conocido: ${withRole} de ${total} (${Math.round((withRole / total) * 100)}%)`,
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
