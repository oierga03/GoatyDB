/**
 * Genera data/<split>/rosters.csv a partir del CSV maestro scrapeado del CT
 * (jugadores_TODAS_LAS_DIVISIONES.csv), mapeando sus columnas a nuestro formato.
 *
 *   npx tsx scripts/build-rosters.ts <ruta-al-csv-maestro> [carpeta-split]
 *
 * Por defecto lee el maestro de la carpeta de descargas y escribe en
 * data/periodo-2-2026/rosters.csv.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "csv-parse/sync";

const MASTER =
  process.argv[2] ??
  "C:/Users/oierg/Downloads/goatydb equipos/jugadores_TODAS_LAS_DIVISIONES.csv";
const SPLIT_DIR = process.argv[3] ?? "periodo-2-2026";
const OUT = join(process.cwd(), "data", SPLIT_DIR, "rosters.csv");

function clean(v: string | undefined): string {
  const s = (v ?? "").trim();
  return s === "N/A" || s === "-" ? "" : s;
}

/// Nombre de juego = parte antes de la almohadilla del nick de LoL.
function gameName(nick: string): string {
  return (nick.split("#")[0] ?? nick).trim();
}

/// Escapa un campo CSV (comillas si hace falta).
function csv(field: string): string {
  return /[",\n]/.test(field) ? `"${field.replace(/"/g, '""')}"` : field;
}

type Row = Record<string, string>;

const rows: Row[] = parse(readFileSync(MASTER, "utf8"), {
  columns: true,
  bom: true,
  trim: true,
  skip_empty_lines: true,
});

/// "periodo_3/division_4" → "División 4". Es IMPRESCINDIBLE: un equipo puede
/// jugar en varios splits (P2 y P3), y sin la división el importador no sabe a
/// qué participación enganchar al jugador.
function divisionName(raw: string): string {
  const m = clean(raw).match(/division[_\s-]?(\d+)/i);
  return m ? `División ${m[1]}` : "";
}

const header = [
  "division",
  "team",
  "player_nick",
  "player_display",
  "player_slug",
  "riot_id",
  "opgg_url",
  "role",
  "roster_status",
  "is_captain",
];

const seen = new Set<string>(); // equipo|nombre_ct para deduplicar (p.ej. HARAM)
const lines: string[] = [header.join(",")];
let sinDivision = 0;

for (const r of rows) {
  const team = clean(r.equipo);
  const ct = clean(r.nombre_ct);
  if (!team || !ct) continue;
  const key = `${team}|${ct}`;
  if (seen.has(key)) continue;
  seen.add(key);

  const division = divisionName(r.division);
  if (!division) sinDivision++;

  const display = gameName(clean(r.nick_lol) || ct);
  lines.push(
    [
      division,
      team,
      ct, // player_nick = handle de CT (identidad)
      display, // player_display = nick de LoL
      "", // player_slug (auto desde el handle)
      clean(r.riot_id_lol),
      clean(r.opgg_url),
      "", // role (posición de LoL: la sacaremos con las partidas)
      clean(r.rol), // roster_status (Jugador/Capitán/Entrenador/…)
      "", // is_captain (se deduce de roster_status = Capitán)
    ]
      .map(csv)
      .join(","),
  );
}

if (sinDivision > 0) {
  console.warn(`⚠️  ${sinDivision} filas sin división reconocible en el maestro.`);
}

writeFileSync(OUT, lines.join("\n") + "\n", "utf8");
console.log(`✅  Escrito ${OUT} con ${lines.length - 1} filas (de ${rows.length} del maestro).`);
