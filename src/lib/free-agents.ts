import { AgeBracket, EloTier, PlayerRole } from "@prisma/client";

// ---------------------------------------------------------------------------
// Tablón de "busco equipo"
//
// Todo lo de este módulo es dato AUTODECLARADO: lo escribe el propio jugador
// sobre sí mismo y no lo verificamos. Se muestra siempre acompañado de su
// OP.GG, que es lo que permite a cualquiera comprobarlo de un clic. No debe
// mezclarse nunca con las estadísticas cotejadas del resto de la web.
// ---------------------------------------------------------------------------

export const ELO_LABELS: Record<EloTier, string> = {
  HIERRO: "Hierro",
  BRONCE: "Bronce",
  PLATA: "Plata",
  ORO: "Oro",
  PLATINO: "Platino",
  ESMERALDA: "Esmeralda",
  DIAMANTE: "Diamante",
  MAESTRO: "Maestro",
  GRANMAESTRO: "Gran Maestro",
  RETADOR: "Retador",
};

/// De menor a mayor. Sirve para ordenar y para el filtro "de X para arriba".
export const ELO_ORDER: EloTier[] = [
  EloTier.HIERRO,
  EloTier.BRONCE,
  EloTier.PLATA,
  EloTier.ORO,
  EloTier.PLATINO,
  EloTier.ESMERALDA,
  EloTier.DIAMANTE,
  EloTier.MAESTRO,
  EloTier.GRANMAESTRO,
  EloTier.RETADOR,
];

export function eloRank(elo: EloTier | null): number {
  return elo ? ELO_ORDER.indexOf(elo) : -1;
}

export function eloLabel(elo: EloTier | null): string {
  return elo ? ELO_LABELS[elo] : "—";
}

/// Color del badge de rango. Un tinte por familia de elo, en la línea del
/// resto de la web (tema claro, texto oscuro sobre fondo suave).
export const ELO_BADGE_CLASS: Record<EloTier, string> = {
  HIERRO: "bg-stone-600/12 text-stone-700 ring-1 ring-inset ring-stone-500/25",
  BRONCE: "bg-amber-800/12 text-amber-900 ring-1 ring-inset ring-amber-800/25",
  PLATA: "bg-slate-500/15 text-slate-700 ring-1 ring-inset ring-slate-400/40",
  ORO: "bg-yellow-600/15 text-yellow-800 ring-1 ring-inset ring-yellow-600/30",
  PLATINO: "bg-teal-600/15 text-teal-800 ring-1 ring-inset ring-teal-600/30",
  ESMERALDA: "bg-emerald-600/15 text-emerald-800 ring-1 ring-inset ring-emerald-600/30",
  DIAMANTE: "bg-sky-600/15 text-sky-800 ring-1 ring-inset ring-sky-500/30",
  MAESTRO: "bg-purple-600/15 text-purple-800 ring-1 ring-inset ring-purple-500/30",
  GRANMAESTRO: "bg-rose-600/15 text-rose-800 ring-1 ring-inset ring-rose-500/30",
  RETADOR: "bg-amber-500/20 text-amber-900 ring-1 ring-inset ring-amber-500/40",
};

// ---------------------------------------------------------------------------
// Edad
//
// A propósito NO pedimos la edad exacta. El circuito es amateur y hay menores;
// publicar edad exacta junto al Discord, en abierto e indexable, es un riesgo
// que no compensa. A un equipo le vale con el tramo.
// ---------------------------------------------------------------------------

export const AGE_LABELS: Record<AgeBracket, string> = {
  EDAD_16_17: "16-17",
  EDAD_18_21: "18-21",
  EDAD_22_MAS: "22+",
};

export const AGE_ORDER: AgeBracket[] = [
  AgeBracket.EDAD_16_17,
  AgeBracket.EDAD_18_21,
  AgeBracket.EDAD_22_MAS,
];

export function ageLabel(age: AgeBracket): string {
  return AGE_LABELS[age] ?? "—";
}

/// Roles que un jugador puede elegir al apuntarse. Sin UNKNOWN: si te apuntas
/// al tablón, sabes a qué juegas.
export const SELECTABLE_ROLES: PlayerRole[] = [
  PlayerRole.TOP,
  PlayerRole.JUNGLE,
  PlayerRole.MID,
  PlayerRole.ADC,
  PlayerRole.SUPPORT,
  PlayerRole.FLEX,
];

// ---------------------------------------------------------------------------
// Caducidad
// ---------------------------------------------------------------------------

/// Un tablón lleno de gente que ya encontró equipo hace meses no sirve para
/// nada, así que los anuncios caducan solos y se renuevan con un clic.
export const AD_LIFETIME_DAYS = 30;

export function expiryFromNow(now = new Date()): Date {
  return new Date(now.getTime() + AD_LIFETIME_DAYS * 24 * 60 * 60 * 1000);
}

/// Días que le quedan a un anuncio (0 si ya caducó).
export function daysLeft(expiresAt: Date, now = new Date()): number {
  const ms = expiresAt.getTime() - now.getTime();
  return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
}

// ---------------------------------------------------------------------------
// Validación del OP.GG
// ---------------------------------------------------------------------------

/// Solo aceptamos enlaces de op.gg. El campo existe para hacer comprobable el
/// elo que el jugador declara; si dejáramos meter cualquier URL sería un vector
/// de spam abierto en una web sin moderación previa.
export function normalizeOpggUrl(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  let url: URL;
  try {
    url = new URL(value.startsWith("http") ? value : `https://${value}`);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  if (host !== "op.gg" && !host.endsWith(".op.gg")) return null;
  url.protocol = "https:";
  return url.toString();
}
