/**
 * GoatyDB — Seed de datos demo.
 *
 * Datos ficticios pero realistas para probar toda la navegación:
 *   - Temporada 2026 + Split 2 2026 (COMPLETED).
 *   - Competición Hextech + su edición para ese split.
 *   - 3 divisiones, 4 equipos, rosters con titulares / sexto / coach.
 *   - Resultados distintos: campeón, finalista, semifinalista, participó.
 *   - Premios de split (destacados) y de jornada.
 *
 * Es idempotente: borra los datos existentes y los vuelve a crear.
 * Ejecutar con:  npm run db:seed
 */
import {
  PrismaClient,
  PlayerRole,
  RosterStatus,
  TeamEntryResult,
  TeamEntryStatus,
  SplitStatus,
  AwardScopeType,
  AwardCategory,
} from "@prisma/client";

const prisma = new PrismaClient();

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ---------------------------------------------------------------------------
// Definición declarativa de los datos demo
// ---------------------------------------------------------------------------

type MemberSpec = {
  nick: string;
  role: PlayerRole;
  primaryRole?: PlayerRole; // por defecto = role
  rosterStatus?: RosterStatus; // por defecto STARTER
  isCaptain?: boolean;
};

type TeamSpec = {
  name: string;
  shortName: string;
  logoUrl?: string;
  divisionLevel: number; // 1, 2, 3...
  finalResult: TeamEntryResult;
  finalPosition: number;
  entryStatus: TeamEntryStatus;
  roster: MemberSpec[];
};

const DIVISIONS = [
  { name: "División 1", level: 1 },
  { name: "División 2", level: 2 },
  { name: "División 3", level: 3 },
];

const TEAMS: TeamSpec[] = [
  {
    name: "Azken Esports",
    shortName: "AZE",
    divisionLevel: 3,
    finalResult: TeamEntryResult.CHAMPION,
    finalPosition: 1,
    entryStatus: TeamEntryStatus.COMPLETED,
    roster: [
      { nick: "Basalt", role: PlayerRole.TOP },
      { nick: "Nomak", role: PlayerRole.JUNGLE },
      { nick: "Oier", role: PlayerRole.MID, isCaptain: true },
      { nick: "Riven7", role: PlayerRole.ADC },
      { nick: "Lumen", role: PlayerRole.SUPPORT },
      { nick: "Kaido", role: PlayerRole.FLEX, primaryRole: PlayerRole.FLEX, rosterStatus: RosterStatus.SIXTH },
      { nick: "Mendi", role: PlayerRole.UNKNOWN, primaryRole: PlayerRole.UNKNOWN, rosterStatus: RosterStatus.COACH },
    ],
  },
  {
    name: "Volk Gaming",
    shortName: "VLK",
    divisionLevel: 3,
    finalResult: TeamEntryResult.RUNNER_UP,
    finalPosition: 2,
    entryStatus: TeamEntryStatus.COMPLETED,
    roster: [
      { nick: "Ironjaw", role: PlayerRole.TOP, isCaptain: true },
      { nick: "Frostbite", role: PlayerRole.JUNGLE },
      { nick: "Zephyr", role: PlayerRole.MID },
      { nick: "Volt", role: PlayerRole.ADC },
      { nick: "Echo", role: PlayerRole.SUPPORT },
      { nick: "Pyre", role: PlayerRole.FLEX, primaryRole: PlayerRole.FLEX, rosterStatus: RosterStatus.SUBSTITUTE },
      { nick: "Vidal", role: PlayerRole.UNKNOWN, primaryRole: PlayerRole.UNKNOWN, rosterStatus: RosterStatus.COACH },
    ],
  },
  {
    name: "Nova Squad",
    shortName: "NOV",
    divisionLevel: 2,
    finalResult: TeamEntryResult.SEMIFINALIST,
    finalPosition: 3,
    entryStatus: TeamEntryStatus.ELIMINATED,
    roster: [
      { nick: "Titan", role: PlayerRole.TOP },
      { nick: "Wraith", role: PlayerRole.JUNGLE, isCaptain: true },
      { nick: "Solaris", role: PlayerRole.MID },
      { nick: "Nyx", role: PlayerRole.ADC },
      { nick: "Halo", role: PlayerRole.SUPPORT },
      { nick: "Rojo", role: PlayerRole.UNKNOWN, primaryRole: PlayerRole.UNKNOWN, rosterStatus: RosterStatus.COACH },
    ],
  },
  {
    name: "Kraken Academy",
    shortName: "KRK",
    divisionLevel: 1,
    finalResult: TeamEntryResult.PARTICIPATED,
    finalPosition: 8,
    entryStatus: TeamEntryStatus.COMPLETED,
    roster: [
      { nick: "Depths", role: PlayerRole.TOP },
      { nick: "Maw", role: PlayerRole.JUNGLE },
      { nick: "Coral", role: PlayerRole.MID, isCaptain: true },
      { nick: "Tide", role: PlayerRole.ADC },
      { nick: "Reef", role: PlayerRole.SUPPORT },
      { nick: "Kelp", role: PlayerRole.FLEX, primaryRole: PlayerRole.FLEX, rosterStatus: RosterStatus.SIXTH },
      { nick: "Ola", role: PlayerRole.UNKNOWN, primaryRole: PlayerRole.UNKNOWN, rosterStatus: RosterStatus.COACH },
    ],
  },
];

async function main() {
  console.log("🌱  Sembrando datos demo de GoatyDB...");

  // --- Limpieza (orden inverso a las dependencias) -------------------------
  await prisma.awardRecipient.deleteMany();
  await prisma.awardEdition.deleteMany();
  await prisma.awardDefinition.deleteMany();
  await prisma.rosterMembership.deleteMany();
  await prisma.teamEntry.deleteMany();
  await prisma.group.deleteMany();
  await prisma.division.deleteMany();
  await prisma.competitionEdition.deleteMany();
  await prisma.competition.deleteMany();
  await prisma.split.deleteMany();
  await prisma.season.deleteMany();
  await prisma.playerAlias.deleteMany();
  await prisma.player.deleteMany();
  await prisma.teamAlias.deleteMany();
  await prisma.team.deleteMany();

  // --- Temporada y Split ---------------------------------------------------
  const season = await prisma.season.create({
    data: {
      name: "2026",
      year: 2026,
      startDate: new Date("2026-01-15"),
      endDate: new Date("2026-12-15"),
    },
  });

  const split = await prisma.split.create({
    data: {
      seasonId: season.id,
      name: "Split 2 2026",
      slug: "split-2-2026",
      sequenceNumber: 2,
      startDate: new Date("2026-04-01"),
      endDate: new Date("2026-06-30"),
      status: SplitStatus.COMPLETED,
    },
  });

  // --- Competición y edición ----------------------------------------------
  const competition = await prisma.competition.create({
    data: {
      name: "Hextech",
      slug: "hextech",
      organizer: "Hextech Community",
      region: "EU",
      game: "League of Legends",
      isActive: true,
    },
  });

  const edition = await prisma.competitionEdition.create({
    data: {
      competitionId: competition.id,
      splitId: split.id,
      name: "Hextech · Split 2 2026",
      slug: "hextech-split-2-2026",
      status: SplitStatus.COMPLETED,
    },
  });

  // --- Divisiones ----------------------------------------------------------
  const divisionByLevel = new Map<number, { id: string }>();
  for (const [index, div] of DIVISIONS.entries()) {
    const created = await prisma.division.create({
      data: {
        competitionEditionId: edition.id,
        name: div.name,
        level: div.level,
        displayOrder: index,
      },
    });
    divisionByLevel.set(div.level, created);
  }

  // --- Equipos, entries y rosters -----------------------------------------
  // Guardamos referencias útiles para asignar premios más adelante.
  const teamEntryByShort = new Map<string, { id: string }>();
  const playerByNick = new Map<string, { id: string }>();

  for (const teamSpec of TEAMS) {
    const team = await prisma.team.create({
      data: {
        name: teamSpec.name,
        shortName: teamSpec.shortName,
        slug: slugify(teamSpec.name),
        logoUrl: teamSpec.logoUrl ?? null,
      },
    });

    const division = divisionByLevel.get(teamSpec.divisionLevel);
    if (!division) throw new Error(`Falta la división nivel ${teamSpec.divisionLevel}`);

    const entry = await prisma.teamEntry.create({
      data: {
        teamId: team.id,
        divisionId: division.id,
        finalResult: teamSpec.finalResult,
        finalPosition: teamSpec.finalPosition,
        status: teamSpec.entryStatus,
      },
    });
    teamEntryByShort.set(teamSpec.shortName, entry);

    for (const member of teamSpec.roster) {
      const player = await prisma.player.create({
        data: {
          displayName: member.nick,
          slug: slugify(member.nick),
          primaryRole: member.primaryRole ?? member.role,
          aliases: {
            create: [{ alias: member.nick, isPrimary: true }],
          },
        },
      });
      playerByNick.set(member.nick, player);

      await prisma.rosterMembership.create({
        data: {
          playerId: player.id,
          teamEntryId: entry.id,
          role: member.role,
          rosterStatus: member.rosterStatus ?? RosterStatus.STARTER,
          isCaptain: member.isCaptain ?? false,
        },
      });
    }
  }

  // --- Definiciones de premios --------------------------------------------
  const awardDefs = await Promise.all([
    prisma.awardDefinition.create({
      data: {
        name: "MVP del Split",
        slug: "mvp-del-split",
        scopeType: AwardScopeType.SPLIT,
        category: AwardCategory.MVP,
        description: "Jugador más valioso a lo largo del split.",
        isFeatured: true,
        displayPriority: 100,
      },
    }),
    prisma.awardDefinition.create({
      data: {
        name: "Ejecutor del Split",
        slug: "ejecutor-del-split",
        scopeType: AwardScopeType.SPLIT,
        category: AwardCategory.EXECUTOR,
        description: "Mejor jugador ofensivo / cerrador de partidas del split.",
        isFeatured: true,
        displayPriority: 90,
      },
    }),
    prisma.awardDefinition.create({
      data: {
        name: "Asistente del Split",
        slug: "asistente-del-split",
        scopeType: AwardScopeType.SPLIT,
        category: AwardCategory.ASSISTANT,
        description: "Mejor jugador de soporte / facilitador del split.",
        isFeatured: true,
        displayPriority: 80,
      },
    }),
    prisma.awardDefinition.create({
      data: {
        name: "MVP de Jornada",
        slug: "mvp-de-jornada",
        scopeType: AwardScopeType.MATCHDAY,
        category: AwardCategory.MVP,
        description: "Jugador más valioso de una jornada concreta.",
        isFeatured: false,
        displayPriority: 50,
      },
    }),
    prisma.awardDefinition.create({
      data: {
        name: "Ejecutor de Jornada",
        slug: "ejecutor-de-jornada",
        scopeType: AwardScopeType.MATCHDAY,
        category: AwardCategory.EXECUTOR,
        description: "Mejor jugador ofensivo de una jornada concreta.",
        isFeatured: false,
        displayPriority: 40,
      },
    }),
  ]);

  const defBySlug = new Map(awardDefs.map((d) => [d.slug, d]));
  const div3 = divisionByLevel.get(3)!;
  const div2 = divisionByLevel.get(2)!;

  // Helper para crear una edición de premio con un único ganador.
  async function awardTo(params: {
    defSlug: string;
    title: string;
    divisionId?: string;
    nick: string;
    teamShort: string;
    citation?: string;
    awardedAt?: Date;
  }) {
    const def = defBySlug.get(params.defSlug);
    const player = playerByNick.get(params.nick);
    const entry = teamEntryByShort.get(params.teamShort);
    if (!def || !player || !entry) {
      throw new Error(`Datos incompletos para premio ${params.title}`);
    }
    await prisma.awardEdition.create({
      data: {
        awardDefinitionId: def.id,
        splitId: split.id,
        divisionId: params.divisionId ?? null,
        title: params.title,
        awardedAt: params.awardedAt ?? split.endDate,
        recipients: {
          create: [
            {
              playerId: player.id,
              teamEntryId: entry.id,
              placement: 1,
              citation: params.citation ?? null,
            },
          ],
        },
      },
    });
  }

  // --- Premios grandes de split (División 3) -------------------------------
  await awardTo({
    defSlug: "mvp-del-split",
    title: "MVP del Split · División 3 · Split 2 2026",
    divisionId: div3.id,
    nick: "Oier",
    teamShort: "AZE",
    citation: "Dominante en la lane central durante todo el split.",
  });
  await awardTo({
    defSlug: "ejecutor-del-split",
    title: "Ejecutor del Split · División 3 · Split 2 2026",
    divisionId: div3.id,
    nick: "Riven7",
    teamShort: "AZE",
    citation: "El mayor foco de daño del campeonato.",
  });
  await awardTo({
    defSlug: "asistente-del-split",
    title: "Asistente del Split · División 3 · Split 2 2026",
    divisionId: div3.id,
    nick: "Echo",
    teamShort: "VLK",
    citation: "Visión y roaming de otro nivel.",
  });

  // --- Premios de jornada --------------------------------------------------
  await awardTo({
    defSlug: "mvp-de-jornada",
    title: "MVP Jornada 3 · División 3 · Split 2 2026",
    divisionId: div3.id,
    nick: "Zephyr",
    teamShort: "VLK",
    awardedAt: new Date("2026-04-20"),
  });
  await awardTo({
    defSlug: "ejecutor-de-jornada",
    title: "Ejecutor Jornada 5 · División 2 · Split 2 2026",
    divisionId: div2.id,
    nick: "Nyx",
    teamShort: "NOV",
    awardedAt: new Date("2026-05-04"),
  });

  // --- Resumen -------------------------------------------------------------
  const counts = {
    players: await prisma.player.count(),
    teams: await prisma.team.count(),
    teamEntries: await prisma.teamEntry.count(),
    rosterMemberships: await prisma.rosterMembership.count(),
    awardEditions: await prisma.awardEdition.count(),
    awardRecipients: await prisma.awardRecipient.count(),
  };
  console.log("✅  Seed completado:", counts);
}

main()
  .catch((e) => {
    console.error("❌  Error en el seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
