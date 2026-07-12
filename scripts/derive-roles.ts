/**
 * Rederiva los roles de jugador a partir de las partidas ya importadas.
 *
 *   npm run db:roles
 *
 * NOTA: el importador (`db:import`) ya lo hace solo al terminar. Este script
 * existe para poder rederivarlos suelto, sin reimportar nada.
 *
 * La lógica vive en scripts/roles.ts (compartida con el importador).
 */
import { PrismaClient } from "@prisma/client";
import { deriveRoles } from "./roles";

const prisma = new PrismaClient();

async function main() {
  console.log("🎯  Derivando roles desde las posiciones de las partidas…");
  const r = await deriveRoles(prisma);
  console.log(
    `✅  Player.primaryRole: ${r.playersWithRole}/${r.totalPlayers} con rol (actualizados: ${r.updatedPlayers})`,
  );
  console.log(
    `✅  RosterMembership.role: ${r.membershipsWithRole}/${r.totalMemberships} con rol (actualizados: ${r.updatedMemberships})`,
  );
  console.log(
    `   (de los cuales ${r.deduced} deducidos por descarte "4 de 5" en la alineación)`,
  );
  console.log(
    `    ${r.noEvidence} participaciones sin evidencia en partidas → siguen UNKNOWN`,
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
