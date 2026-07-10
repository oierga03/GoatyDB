/**
 * GoatyDB — Importador de datos reales (idempotente, por CSV).
 *
 * Lee:
 *   data/split.json   → temporada, split, competición, edición y divisiones.
 *   data/rosters.csv  → una fila por jugador dentro de un equipo (con su resultado).
 *   data/awards.csv   → una fila por premio recibido (opcional).
 *
 * Usa UPSERT sobre claves naturales (slugs y restricciones únicas), por lo que
 * se puede re-ejecutar sin duplicar. NO borra nada... salvo que pases --fresh,
 * que vacía toda la base de datos antes de importar (carga limpia).
 *
 *   npm run db:import            # merge/upsert sobre lo que haya
 *   npm run db:import -- --fresh # vaciar y cargar desde cero
 */
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { parse } from "csv-parse/sync";
import {
  PrismaClient,
  PlayerRole,
  RosterStatus,
  TeamEntryResult,
  AwardScopeType,
  AwardCategory,
  SplitStatus,
  Prisma,
} from "@prisma/client";
import { slugify } from "../src/lib/slug";

const prisma = new PrismaClient();
const FRESH = process.argv.includes("--fresh");
// --awards / --matches: importar solo esa sección (rápido para iterar).
const ONLY_AWARDS = process.argv.includes("--awards");
const ONLY_MATCHES = process.argv.includes("--matches");
const ONLY_SOME = ONLY_AWARDS || ONLY_MATCHES;

/**
 * Cada split vive en su propia carpeta dentro de /data
 * (ej. data/periodo-2-2026). Así, añadir un split futuro es crear otra carpeta
 * y volver a importar, sin tocar lo anterior.
 */
function resolveSplitDir(): string {
  const base = join(process.cwd(), "data");
  const arg = process.argv.slice(2).find((a) => !a.startsWith("--"));
  const subdirs = existsSync(base)
    ? readdirSync(base).filter(
        (f) =>
          statSync(join(base, f)).isDirectory() &&
          existsSync(join(base, f, "split.json")),
      )
    : [];

  if (arg) {
    const dir = join(base, arg);
    if (!existsSync(join(dir, "split.json"))) {
      throw new Error(
        `No existe data/${arg}/split.json. Splits disponibles: ${subdirs.join(", ") || "(ninguno)"}`,
      );
    }
    return dir;
  }
  if (subdirs.length === 1) return join(base, subdirs[0]);
  throw new Error(
    `Indica qué split cargar: npm run db:import -- <carpeta>. Disponibles: ${subdirs.join(", ") || "(ninguno)"}`,
  );
}

const DATA_DIR = resolveSplitDir();

// ---------------------------------------------------------------------------
// Utilidades de parseo
// ---------------------------------------------------------------------------

function norm(value: string | undefined | null): string {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

function readCsv(fileName: string): Record<string, string>[] {
  const path = join(DATA_DIR, fileName);
  if (!existsSync(path)) return [];
  const raw = readFileSync(path, "utf8");
  // Autodetección de separador: Excel en español suele usar ";".
  const header = raw.split(/\r?\n/)[0] ?? "";
  const delimiter = header.split(";").length > header.split(",").length ? ";" : ",";
  return parse(raw, {
    columns: true,
    delimiter,
    bom: true,
    trim: true,
    skip_empty_lines: true,
    relax_column_count: true,
  }) as Record<string, string>[];
}

function bool(value: string | undefined): boolean {
  return ["true", "1", "x", "si", "yes", "y", "verdadero"].includes(norm(value));
}

function optInt(value: string | undefined): number | null {
  const n = Number.parseInt((value ?? "").trim(), 10);
  return Number.isFinite(n) ? n : null;
}

function optDate(value: string | undefined): Date | null {
  const v = (value ?? "").trim();
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function optStr(value: string | undefined): string | null {
  const v = (value ?? "").trim();
  return v ? v : null;
}

/// Parsea un récord "2-0" (o "2–0", "2/0") en victorias y derrotas.
function parseRecord(value: string | undefined): {
  wins: number | null;
  losses: number | null;
} {
  const m = (value ?? "").trim().match(/^(\d+)\s*[-–/]\s*(\d+)$/);
  if (!m) return { wins: null, losses: null };
  return { wins: Number(m[1]), losses: Number(m[2]) };
}

/// Deriva un orden de visualización a partir del nombre del grupo.
/// "Grupo A" → 0, "Grupo B" → 1, "Grupo 2" → 2.
function groupOrder(name: string): number {
  const token = name.trim().match(/([A-Za-z0-9]+)\s*$/)?.[1] ?? "";
  if (/^\d+$/.test(token)) return Number.parseInt(token, 10);
  if (/^[A-Za-z]$/.test(token)) return token.toUpperCase().charCodeAt(0) - 65;
  return 0;
}

/// Encuentra a un jugador por: slug forzado → slug del nick → nick de LoL
/// (displayName) → alias (handle CT) → Riot ID. Devuelve null si no hay uno claro.
async function resolvePlayer(slugOverride: string | null, nick: string) {
  if (slugOverride) {
    const bySlug = await prisma.player.findUnique({ where: { slug: slugOverride } });
    if (bySlug) return bySlug;
  }
  const bySlug = await prisma.player.findUnique({ where: { slug: slugify(nick) } });
  if (bySlug) return bySlug;
  const byName = await prisma.player.findMany({
    where: { displayName: { equals: nick, mode: "insensitive" } },
    take: 2,
  });
  if (byName.length === 1) return byName[0];
  const byAlias = await prisma.player.findFirst({
    where: { aliases: { some: { alias: { equals: nick, mode: "insensitive" } } } },
  });
  if (byAlias) return byAlias;
  const byRiot = await prisma.player.findFirst({
    where: { riotId: { equals: nick, mode: "insensitive" } },
  });
  return byRiot;
}

// Diccionarios enum con sinónimos en español/inglés.
const ROLE: Record<string, PlayerRole> = {
  top: PlayerRole.TOP,
  toplane: PlayerRole.TOP,
  jungle: PlayerRole.JUNGLE,
  jungla: PlayerRole.JUNGLE,
  jgl: PlayerRole.JUNGLE,
  jg: PlayerRole.JUNGLE,
  mid: PlayerRole.MID,
  medio: PlayerRole.MID,
  adc: PlayerRole.ADC,
  bot: PlayerRole.ADC,
  bottom: PlayerRole.ADC,
  support: PlayerRole.SUPPORT,
  soporte: PlayerRole.SUPPORT,
  supp: PlayerRole.SUPPORT,
  sup: PlayerRole.SUPPORT,
  flex: PlayerRole.FLEX,
  unknown: PlayerRole.UNKNOWN,
  desconocido: PlayerRole.UNKNOWN,
  "": PlayerRole.UNKNOWN,
  "-": PlayerRole.UNKNOWN,
};

const RESULT: Record<string, TeamEntryResult> = {
  campeon: TeamEntryResult.CHAMPION,
  champion: TeamEntryResult.CHAMPION,
  oro: TeamEntryResult.CHAMPION,
  finalista: TeamEntryResult.RUNNER_UP,
  subcampeon: TeamEntryResult.RUNNER_UP,
  "runner up": TeamEntryResult.RUNNER_UP,
  runner_up: TeamEntryResult.RUNNER_UP,
  plata: TeamEntryResult.RUNNER_UP,
  semifinalista: TeamEntryResult.SEMIFINALIST,
  semifinal: TeamEntryResult.SEMIFINALIST,
  sf: TeamEntryResult.SEMIFINALIST,
  cuartos: TeamEntryResult.QUARTERFINALIST,
  quarterfinalist: TeamEntryResult.QUARTERFINALIST,
  qf: TeamEntryResult.QUARTERFINALIST,
  playoffs: TeamEntryResult.PLAYOFFS,
  "fase de grupos": TeamEntryResult.GROUP_STAGE,
  grupos: TeamEntryResult.GROUP_STAGE,
  "group stage": TeamEntryResult.GROUP_STAGE,
  participo: TeamEntryResult.PARTICIPATED,
  participated: TeamEntryResult.PARTICIPATED,
  retirado: TeamEntryResult.WITHDRAWN,
  withdrawn: TeamEntryResult.WITHDRAWN,
  descalificado: TeamEntryResult.DISQUALIFIED,
  disqualified: TeamEntryResult.DISQUALIFIED,
  dq: TeamEntryResult.DISQUALIFIED,
  "": TeamEntryResult.UNKNOWN,
};

const ROSTER: Record<string, RosterStatus> = {
  // Jugadores
  jugador: RosterStatus.STARTER,
  player: RosterStatus.STARTER,
  titular: RosterStatus.STARTER,
  starter: RosterStatus.STARTER,
  // Capitán: entrada propia. No asumimos si juega o no (se resuelve con partidas).
  capitan: RosterStatus.CAPTAIN,
  captain: RosterStatus.CAPTAIN,
  suplente: RosterStatus.SUBSTITUTE,
  reserva: RosterStatus.SUBSTITUTE,
  substitute: RosterStatus.SUBSTITUTE,
  sub: RosterStatus.SUBSTITUTE,
  sexto: RosterStatus.SIXTH,
  sixth: RosterStatus.SIXTH,
  inactivo: RosterStatus.INACTIVE,
  inactive: RosterStatus.INACTIVE,
  // Cuerpo técnico: solo el coach tiene rol propio.
  coach: RosterStatus.COACH,
  entrenador: RosterStatus.COACH,
  // El resto de cargos (propietario, CEO, mánager, analista…) → staff genérico.
  propietario: RosterStatus.STAFF,
  owner: RosterStatus.STAFF,
  dueno: RosterStatus.STAFF,
  ceo: RosterStatus.STAFF,
  presidente: RosterStatus.STAFF,
  president: RosterStatus.STAFF,
  manager: RosterStatus.STAFF,
  "team manager": RosterStatus.STAFF,
  analista: RosterStatus.STAFF,
  analyst: RosterStatus.STAFF,
  staff: RosterStatus.STAFF,
  "": RosterStatus.STARTER,
};

const SCOPE: Record<string, AwardScopeType> = {
  split: AwardScopeType.SPLIT,
  division: AwardScopeType.DIVISION,
  jornada: AwardScopeType.MATCHDAY,
  matchday: AwardScopeType.MATCHDAY,
  otro: AwardScopeType.OTHER,
  other: AwardScopeType.OTHER,
};

const CATEGORY: Record<string, AwardCategory> = {
  mvp: AwardCategory.MVP,
  ejecutor: AwardCategory.EXECUTOR,
  executor: AwardCategory.EXECUTOR,
  asistente: AwardCategory.ASSISTANT,
  assistant: AwardCategory.ASSISTANT,
  "all-pro": AwardCategory.ALL_PRO,
  "all pro": AwardCategory.ALL_PRO,
  allpro: AwardCategory.ALL_PRO,
  rendimiento: AwardCategory.PERFORMANCE,
  performance: AwardCategory.PERFORMANCE,
  especial: AwardCategory.CUSTOM,
  custom: AwardCategory.CUSTOM,
};

function mapEnum<T>(dict: Record<string, T>, raw: string, field: string): T {
  const key = norm(raw);
  if (key in dict) return dict[key];
  throw new Error(
    `Valor no reconocido para "${field}": "${raw}". Valores válidos: ${[
      ...new Set(Object.values(dict as Record<string, string>)),
    ].join(", ")}`,
  );
}

// ---------------------------------------------------------------------------
// Importación
// ---------------------------------------------------------------------------

type SplitConfig = {
  season: { name: string; year: number; startDate?: string; endDate?: string };
  split: {
    name: string;
    sequenceNumber: number;
    status?: string;
    startDate?: string;
    endDate?: string;
  };
  competition: {
    name: string;
    organizer?: string;
    region?: string;
    game?: string;
  };
  edition: { name: string; status?: string };
  divisions: { name: string; level: number }[];
};

async function wipe() {
  // OJO: --fresh vacía TODA la base (todos los splits). Úsalo solo para un
  // reinicio completo, no para añadir un split nuevo (para eso usa el merge).
  console.log("🧹  --fresh: vaciando TODA la base de datos (todos los splits)…");
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
}

async function main() {
  console.log(`📥  Importando split desde ${DATA_DIR.replace(process.cwd(), ".")} …`);

  const config: SplitConfig = JSON.parse(
    readFileSync(join(DATA_DIR, "split.json"), "utf8"),
  );

  if (FRESH) await wipe();

  // --- Estructura de la competición --------------------------------------
  const season = await prisma.season.upsert({
    where: { name: config.season.name },
    create: {
      name: config.season.name,
      year: config.season.year,
      startDate: optDate(config.season.startDate),
      endDate: optDate(config.season.endDate),
    },
    update: { year: config.season.year },
  });

  const split = await prisma.split.upsert({
    where: { slug: slugify(config.split.name) },
    create: {
      seasonId: season.id,
      name: config.split.name,
      slug: slugify(config.split.name),
      sequenceNumber: config.split.sequenceNumber,
      status: (config.split.status as SplitStatus) ?? SplitStatus.COMPLETED,
      startDate: optDate(config.split.startDate),
      endDate: optDate(config.split.endDate),
    },
    update: {
      seasonId: season.id,
      name: config.split.name,
      sequenceNumber: config.split.sequenceNumber,
      status: (config.split.status as SplitStatus) ?? SplitStatus.COMPLETED,
    },
  });

  const competition = await prisma.competition.upsert({
    where: { slug: slugify(config.competition.name) },
    create: {
      name: config.competition.name,
      slug: slugify(config.competition.name),
      organizer: config.competition.organizer,
      region: config.competition.region,
      game: config.competition.game ?? "League of Legends",
    },
    update: {
      name: config.competition.name,
      organizer: config.competition.organizer,
      region: config.competition.region,
    },
  });

  const edition = await prisma.competitionEdition.upsert({
    where: { slug: slugify(config.edition.name) },
    create: {
      competitionId: competition.id,
      splitId: split.id,
      name: config.edition.name,
      slug: slugify(config.edition.name),
      status: (config.edition.status as SplitStatus) ?? SplitStatus.COMPLETED,
    },
    update: {
      competitionId: competition.id,
      splitId: split.id,
      name: config.edition.name,
      status: (config.edition.status as SplitStatus) ?? SplitStatus.COMPLETED,
    },
  });

  const divisionByName = new Map<string, string>();
  for (const [i, div] of config.divisions.entries()) {
    const created = await prisma.division.upsert({
      where: {
        competitionEditionId_name: {
          competitionEditionId: edition.id,
          name: div.name,
        },
      },
      create: {
        competitionEditionId: edition.id,
        name: div.name,
        level: div.level,
        displayOrder: i,
      },
      update: { level: div.level, displayOrder: i },
    });
    divisionByName.set(norm(div.name), created.id);
  }

  // --- Equipos (sin roster todavía) --------------------------------------
  // teams.csv permite dar de alta equipos con su logo/división aunque aún no
  // tengamos jugadores. Es opcional; rosters.csv también crea equipos.
  const teamRows = ONLY_SOME ? [] : readCsv("teams.csv");
  for (const [index, row] of teamRows.entries()) {
    const line = index + 2;
    try {
      const teamName = row.team_name?.trim();
      if (!teamName) throw new Error("Falta team_name");
      const teamSlug = slugify(teamName);

      const team = await prisma.team.upsert({
        where: { slug: teamSlug },
        create: {
          name: teamName,
          slug: teamSlug,
          shortName: optStr(row.team_short),
          logoUrl: optStr(row.team_logo),
          foundedYear: optInt(row.founded_year),
        },
        update: {
          name: teamName,
          shortName: optStr(row.team_short),
          ...(optStr(row.team_logo) ? { logoUrl: optStr(row.team_logo) } : {}),
          ...(optInt(row.founded_year) != null
            ? { foundedYear: optInt(row.founded_year) }
            : {}),
        },
      });

      // Si indican división, creamos/actualizamos su participación.
      const divName = optStr(row.division);
      if (divName) {
        const divisionId = divisionByName.get(norm(divName));
        if (!divisionId) {
          throw new Error(
            `División "${divName}" no está en split.json (divisiones: ${config.divisions
              .map((d) => d.name)
              .join(", ")})`,
          );
        }
        // Grupo opcional dentro de la división (Grupo A, B…).
        let groupId: string | null = null;
        const groupName = optStr(row.group);
        if (groupName) {
          const group = await prisma.group.upsert({
            where: { divisionId_name: { divisionId, name: groupName } },
            create: {
              divisionId,
              name: groupName,
              displayOrder: groupOrder(groupName),
            },
            update: {},
          });
          groupId = group.id;
        }

        const rec = parseRecord(row.final_record);
        await prisma.teamEntry.upsert({
          where: { teamId_divisionId: { teamId: team.id, divisionId } },
          create: {
            teamId: team.id,
            divisionId,
            groupId,
            finalResult: mapEnum(RESULT, row.final_result ?? "", "final_result"),
            finalPosition: optInt(row.final_position),
            groupWins: rec.wins,
            groupLosses: rec.losses,
          },
          update: {
            groupId,
            finalResult: mapEnum(RESULT, row.final_result ?? "", "final_result"),
            finalPosition: optInt(row.final_position),
            groupWins: rec.wins,
            groupLosses: rec.losses,
          },
        });
      }
    } catch (e) {
      throw new Error(`teams.csv línea ${line}: ${(e as Error).message}`);
    }
  }

  // --- Rosters ------------------------------------------------------------
  // Los rosters se enganchan a las participaciones ya cargadas por teams.csv.
  // NO tocan el resultado/récord del equipo; solo añaden jugadores/staff.
  const rosterRows = ONLY_SOME ? [] : readCsv("rosters.csv");
  const entryCache = new Map<string, string>(); // team.id|divNorm -> teamEntryId

  for (const [index, row] of rosterRows.entries()) {
    const line = index + 2; // +1 header, +1 base-1
    try {
      // Equipo: por siglas o nombre (debería existir ya por teams.csv).
      const teamRef = optStr(row.team_name) ?? optStr(row.team);
      if (!teamRef) throw new Error("Falta team_name");
      let team = await prisma.team.findFirst({
        where: {
          OR: [
            { slug: slugify(teamRef) },
            { shortName: { equals: teamRef, mode: "insensitive" } },
            { name: { equals: teamRef, mode: "insensitive" } },
          ],
        },
      });
      if (!team) {
        team = await prisma.team.create({
          data: {
            name: teamRef,
            slug: slugify(teamRef),
            shortName: optStr(row.team_short),
            logoUrl: optStr(row.team_logo),
          },
        });
      }

      // Participación del equipo. Si no se indica división, se usa la única
      // que tenga el equipo (lo normal con un solo split).
      const divName = optStr(row.division);
      const cacheKey = `${team.id}|${norm(divName ?? "")}`;
      let teamEntryId = entryCache.get(cacheKey);
      if (!teamEntryId) {
        if (divName) {
          const divisionId = divisionByName.get(norm(divName));
          if (!divisionId) {
            throw new Error(`División "${divName}" no está en split.json`);
          }
          const entry = await prisma.teamEntry.upsert({
            where: { teamId_divisionId: { teamId: team.id, divisionId } },
            create: { teamId: team.id, divisionId },
            update: {}, // no tocamos resultado/récord (los gestiona teams.csv)
          });
          teamEntryId = entry.id;
        } else {
          const entries = await prisma.teamEntry.findMany({
            where: { teamId: team.id },
          });
          if (entries.length === 1) {
            teamEntryId = entries[0].id;
          } else if (entries.length === 0) {
            throw new Error(
              `"${teamRef}" no tiene participación cargada; añade la columna 'division'.`,
            );
          } else {
            throw new Error(
              `"${teamRef}" juega en varias divisiones; indica la 'division' en el roster.`,
            );
          }
        }
        entryCache.set(cacheKey, teamEntryId);
      }

      // Jugador. Identidad = player_slug (o slug del handle/nick de CT).
      const nick = optStr(row.player_nick);
      if (!nick) throw new Error("Falta player_nick");
      const playerSlug = optStr(row.player_slug) ?? slugify(nick);
      const role = mapEnum(ROLE, row.role ?? "", "role");
      // displayName = nick de LoL si lo tenemos; si no, el handle de CT.
      const displayName = optStr(row.player_display) ?? nick;
      const riotId = optStr(row.riot_id);
      const opggUrl = optStr(row.opgg_url);

      const player = await prisma.player.upsert({
        where: { slug: playerSlug },
        create: {
          displayName,
          slug: playerSlug,
          primaryRole: role,
          riotId,
          opggUrl,
          // Guardamos el handle de CT como alias (la identidad de plataforma).
          aliases: { create: [{ alias: nick, isPrimary: false }] },
        },
        update: {
          displayName,
          ...(riotId ? { riotId } : {}),
          ...(opggUrl ? { opggUrl } : {}),
        },
      });

      const rosterStatus = mapEnum(ROSTER, row.roster_status ?? "", "roster_status");
      const isCaptain =
        bool(row.is_captain) || ["capitan", "captain"].includes(norm(row.roster_status));
      await prisma.rosterMembership.upsert({
        where: { playerId_teamEntryId: { playerId: player.id, teamEntryId } },
        create: { playerId: player.id, teamEntryId, role, rosterStatus, isCaptain },
        update: { role, rosterStatus, isCaptain },
      });
    } catch (e) {
      throw new Error(`rosters.csv línea ${line}: ${(e as Error).message}`);
    }
  }

  // --- Premios ------------------------------------------------------------
  const awardRows = ONLY_MATCHES ? [] : readCsv("awards.csv");
  for (const [index, row] of awardRows.entries()) {
    const line = index + 2;
    try {
      const awardName = row.award_name?.trim();
      if (!awardName) throw new Error("Falta award_name");
      const awardSlug = optStr(row.award_slug) ?? slugify(awardName);
      const scope = mapEnum(SCOPE, row.scope ?? "", "scope");
      const category = mapEnum(CATEGORY, row.category ?? "", "category");

      const def = await prisma.awardDefinition.upsert({
        where: { slug: awardSlug },
        create: {
          name: awardName,
          slug: awardSlug,
          scopeType: scope,
          category,
          isFeatured: bool(row.is_featured),
          displayPriority: optInt(row.display_priority) ?? 0,
        },
        update: {
          name: awardName,
          scopeType: scope,
          category,
          isFeatured: bool(row.is_featured),
          displayPriority: optInt(row.display_priority) ?? 0,
        },
      });

      const title = row.title?.trim();
      if (!title) throw new Error("Falta title");
      const awardDivisionId = row.division
        ? divisionByName.get(norm(row.division)) ?? null
        : null;

      const matchday = optInt(row.matchday);
      const awardEdition = await prisma.awardEdition.upsert({
        where: { awardDefinitionId_title: { awardDefinitionId: def.id, title } },
        create: {
          awardDefinitionId: def.id,
          splitId: split.id,
          divisionId: awardDivisionId,
          matchday,
          title,
          awardedAt: optDate(row.awarded_at) ?? split.endDate,
          imageUrl: optStr(row.image_url),
        },
        update: {
          splitId: split.id,
          divisionId: awardDivisionId,
          matchday,
          awardedAt: optDate(row.awarded_at) ?? split.endDate,
          imageUrl: optStr(row.image_url),
        },
      });

      // Jugador receptor. Se resuelve por slug, nick de LoL (displayName) o alias (handle CT).
      const nick = row.player_nick?.trim();
      if (!nick) throw new Error("Falta player_nick");
      const player = await resolvePlayer(optStr(row.player_slug), nick);
      if (!player) {
        throw new Error(
          `No se encontró al jugador "${nick}" (¿slug/nick de LoL/handle CT correcto?)`,
        );
      }

      // Equipo con el que lo ganó (opcional): lo buscamos por short o nombre.
      let teamEntryId: string | null = null;
      const teamRef = optStr(row.team);
      if (teamRef) {
        const team = await prisma.team.findFirst({
          where: {
            OR: [
              { slug: slugify(teamRef) },
              { shortName: { equals: teamRef, mode: "insensitive" } },
              { name: { equals: teamRef, mode: "insensitive" } },
            ],
          },
          include: { entries: true },
        });
        if (team) {
          const entry =
            (awardDivisionId
              ? team.entries.find((e) => e.divisionId === awardDivisionId)
              : undefined) ?? team.entries[0];
          teamEntryId = entry?.id ?? null;
        }
      }

      await prisma.awardRecipient.upsert({
        where: {
          awardEditionId_playerId: {
            awardEditionId: awardEdition.id,
            playerId: player.id,
          },
        },
        create: {
          awardEditionId: awardEdition.id,
          playerId: player.id,
          teamEntryId,
          placement: 1,
          citation: optStr(row.citation),
        },
        update: { teamEntryId, citation: optStr(row.citation) },
      });
    } catch (e) {
      throw new Error(`awards.csv línea ${line}: ${(e as Error).message}`);
    }
  }

  // --- Partidas -----------------------------------------------------------
  // matches.csv: una fila por jugador-partida. Los equipos/jugadores deben
  // existir ya. side = A|B (equipo A/B del enfrentamiento). win = 1|0.
  const matchRows = ONLY_AWARDS ? [] : readCsv("matches.csv");
  const matchCache = new Map<string, { id: string; teamAId: string; teamBId: string }>();
  const gameCache = new Map<string, string>(); // matchId|game -> gameId
  const unresolvedMatchPlayers = new Set<string>();
  const autoCreatedMatchPlayers = new Set<string>();

  // Crea un jugador nuevo a partir del nombre del marcador cuando no hay forma
  // de confirmar su identidad. Se marca needsReview para poder revisarlo/fusionarlo
  // más tarde (la comunidad puede avisar vía el sistema de reportes).
  async function createMatchPlayer(label: string) {
    const base = slugify(label) || "jugador";
    let slug = base;
    let n = 2;
    while (await prisma.player.findUnique({ where: { slug } })) {
      slug = `${base}-${n++}`;
    }
    return prisma.player.create({
      data: { slug, displayName: label, needsReview: true },
    });
  }

  async function resolveTeam(ref: string) {
    return prisma.team.findFirst({
      where: {
        OR: [
          { slug: slugify(ref) },
          { shortName: { equals: ref, mode: "insensitive" } },
          { name: { equals: ref, mode: "insensitive" } },
        ],
      },
    });
  }

  // Resuelve el nombre del marcador: primero dentro de los dos equipos del
  // enfrentamiento (por displayName / game-name del Riot ID / alias), y si no,
  // de forma global sin ambigüedad. Devuelve null si no hay una única coincidencia.
  async function resolveMatchPlayer(label: string, teamAId: string, teamBId: string) {
    const byName = (extra: Prisma.PlayerWhereInput): Prisma.PlayerWhereInput => ({
      ...extra,
      OR: [
        { displayName: { equals: label, mode: "insensitive" } },
        { riotId: { startsWith: `${label}#`, mode: "insensitive" } },
        { aliases: { some: { alias: { equals: label, mode: "insensitive" } } } },
      ],
    });
    const inTeams = await prisma.player.findMany({
      where: byName({
        rosterMemberships: { some: { teamEntry: { teamId: { in: [teamAId, teamBId] } } } },
      }),
      take: 2,
    });
    if (inTeams.length === 1) return inTeams[0];
    const global = await prisma.player.findMany({ where: byName({}), take: 2 });
    if (global.length === 1) return global[0];
    return null;
  }

  for (const [index, row] of matchRows.entries()) {
    const line = index + 2;
    try {
      const divName = optStr(row.division);
      const divisionId = divName ? divisionByName.get(norm(divName)) : null;
      if (!divisionId) throw new Error(`División "${divName}" no está en split.json`);
      const round = optStr(row.round);
      if (!round) throw new Error("Falta round");

      const teamARef = optStr(row.team_a);
      const teamBRef = optStr(row.team_b);
      if (!teamARef || !teamBRef) throw new Error("Faltan team_a/team_b");

      const matchKey = `${divisionId}|${norm(round)}|${slugify(teamARef)}|${slugify(teamBRef)}`;
      let match = matchCache.get(matchKey);
      if (!match) {
        const teamA = await resolveTeam(teamARef);
        const teamB = await resolveTeam(teamBRef);
        if (!teamA) throw new Error(`Equipo A "${teamARef}" no encontrado`);
        if (!teamB) throw new Error(`Equipo B "${teamBRef}" no encontrado`);
        const scoreA = optInt(row.score_a) ?? 0;
        const scoreB = optInt(row.score_b) ?? 0;
        const winnerSide = scoreA === scoreB ? null : scoreA > scoreB ? "A" : "B";
        const m = await prisma.match.upsert({
          where: {
            splitId_divisionId_round_teamAId_teamBId: {
              splitId: split.id,
              divisionId,
              round,
              teamAId: teamA.id,
              teamBId: teamB.id,
            },
          },
          create: {
            splitId: split.id,
            divisionId,
            round,
            matchday: optInt(row.matchday),
            teamAId: teamA.id,
            teamBId: teamB.id,
            scoreA,
            scoreB,
            winnerSide,
          },
          update: { scoreA, scoreB, winnerSide, matchday: optInt(row.matchday) },
        });
        match = { id: m.id, teamAId: teamA.id, teamBId: teamB.id };
        matchCache.set(matchKey, match);
      }

      const gameNumber = optInt(row.game) ?? 1;
      const gameKey = `${match.id}|${gameNumber}`;
      let gameId = gameCache.get(gameKey);
      const side = (optStr(row.side) ?? "").toUpperCase();
      if (side !== "A" && side !== "B") throw new Error(`side inválido: "${row.side}"`);
      const win = bool(row.win);
      if (!gameId) {
        const g = await prisma.game.upsert({
          where: { matchId_gameNumber: { matchId: match.id, gameNumber } },
          create: { matchId: match.id, gameNumber },
          update: {},
        });
        gameId = g.id;
        gameCache.set(gameKey, gameId);
      }
      // El ganador de la partida = el side del jugador que ganó.
      if (win) {
        await prisma.game.update({
          where: { id: gameId },
          data: { winnerSide: side },
        });
      }

      const slugOverride = optStr(row.player_slug);
      const label = optStr(row.player_label) ?? "";
      let player = slugOverride
        ? await prisma.player.findUnique({ where: { slug: slugOverride } })
        : await resolveMatchPlayer(label, match.teamAId, match.teamBId);
      if (!player && slugOverride) {
        // player_slug puesto a mano pero inexistente: es un error de datos, no autocrear.
        unresolvedMatchPlayers.add(`${teamARef} vs ${teamBRef} · slug "${slugOverride}" no existe`);
        continue;
      }
      if (!player) {
        if (!label) {
          unresolvedMatchPlayers.add(`${teamARef} vs ${teamBRef} · (fila sin nombre)`);
          continue;
        }
        // No se pierde el dato: se crea el jugador (marcado para revisión).
        player = await createMatchPlayer(label);
        autoCreatedMatchPlayers.add(`${teamARef} vs ${teamBRef} · "${label}" → ${player.slug}`);
      }
      const teamId = side === "A" ? match.teamAId : match.teamBId;
      const position = mapEnum(ROLE, row.position ?? "", "position");

      await prisma.playerGameStat.upsert({
        where: { gameId_playerId: { gameId, playerId: player.id } },
        create: {
          gameId,
          playerId: player.id,
          teamId,
          side,
          position,
          champion: optStr(row.champion) ?? "",
          kills: optInt(row.k) ?? 0,
          deaths: optInt(row.d) ?? 0,
          assists: optInt(row.a) ?? 0,
          win,
        },
        update: {
          teamId,
          side,
          position,
          champion: optStr(row.champion) ?? "",
          kills: optInt(row.k) ?? 0,
          deaths: optInt(row.d) ?? 0,
          assists: optInt(row.a) ?? 0,
          win,
        },
      });
    } catch (e) {
      throw new Error(`matches.csv línea ${line}: ${(e as Error).message}`);
    }
  }

  if (autoCreatedMatchPlayers.size > 0) {
    console.log(`\n🆕  ${autoCreatedMatchPlayers.size} jugador(es) autocreado(s) desde marcadores (needsReview, revisables vía reportes):`);
    for (const u of [...autoCreatedMatchPlayers].sort()) console.log("   -", u);
    console.log("");
  }

  if (unresolvedMatchPlayers.size > 0) {
    console.log(`\n⚠️  ${unresolvedMatchPlayers.size} fila(s) del marcador con problemas de datos:`);
    for (const u of [...unresolvedMatchPlayers].sort()) console.log("   -", u);
    console.log("");
  }

  // --- Resumen ------------------------------------------------------------
  const counts = {
    players: await prisma.player.count(),
    teams: await prisma.team.count(),
    teamEntries: await prisma.teamEntry.count(),
    rosterMemberships: await prisma.rosterMembership.count(),
    awardEditions: await prisma.awardEdition.count(),
    awardRecipients: await prisma.awardRecipient.count(),
    matches: await prisma.match.count(),
    games: await prisma.game.count(),
    playerGameStats: await prisma.playerGameStat.count(),
  };
  console.log(`✅  Importación completada (${FRESH ? "carga limpia" : "merge"}):`, counts);
}

main()
  .catch((e) => {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      console.error(`❌  Error de base de datos (${e.code}):`, e.message);
    } else {
      console.error("❌", (e as Error).message);
    }
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
