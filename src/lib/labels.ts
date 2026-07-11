import {
  PlayerRole,
  RosterStatus,
  TeamEntryResult,
  AwardCategory,
  AwardScopeType,
} from "@prisma/client";

// ---------------------------------------------------------------------------
// Roles
// ---------------------------------------------------------------------------

export const ROLE_LABELS: Record<PlayerRole, string> = {
  TOP: "Top",
  JUNGLE: "Jungla",
  MID: "Mid",
  ADC: "ADC",
  SUPPORT: "Support",
  FLEX: "Polivalente",
  UNKNOWN: "—",
};

/// Orden de posiciones para mostrar un roster ordenado.
export const ROLE_ORDER: PlayerRole[] = [
  PlayerRole.TOP,
  PlayerRole.JUNGLE,
  PlayerRole.MID,
  PlayerRole.ADC,
  PlayerRole.SUPPORT,
  PlayerRole.FLEX,
  PlayerRole.UNKNOWN,
];

export function roleLabel(role: PlayerRole): string {
  return ROLE_LABELS[role] ?? role;
}

// ---------------------------------------------------------------------------
// Estado dentro del roster
// ---------------------------------------------------------------------------

export const ROSTER_STATUS_LABELS: Record<RosterStatus, string> = {
  STARTER: "Titular",
  SUBSTITUTE: "Suplente",
  SIXTH: "Sexto",
  CAPTAIN: "Capitán",
  COACH: "Coach",
  MANAGER: "Manager",
  ANALYST: "Analista",
  STAFF: "Staff",
  INACTIVE: "Inactivo",
};

/// Agrupa los estados de roster para ordenarlos: jugadores, capitán, staff.
export const ROSTER_STATUS_GROUP: Record<RosterStatus, number> = {
  STARTER: 0,
  SIXTH: 1,
  SUBSTITUTE: 2,
  INACTIVE: 3,
  CAPTAIN: 4,
  COACH: 5,
  MANAGER: 6,
  ANALYST: 7,
  STAFF: 8,
};

export function rosterStatusLabel(status: RosterStatus): string {
  return ROSTER_STATUS_LABELS[status] ?? status;
}

/// Cargos no jugadores (cuerpo técnico / dirección).
export function isStaff(status: RosterStatus): boolean {
  return (
    status === RosterStatus.COACH ||
    status === RosterStatus.MANAGER ||
    status === RosterStatus.ANALYST ||
    status === RosterStatus.STAFF
  );
}

/// No confirmados como jugadores: staff + capitán (ambiguo hasta ver partidas).
export function isNonPlayer(status: RosterStatus): boolean {
  return isStaff(status) || status === RosterStatus.CAPTAIN;
}

// ---------------------------------------------------------------------------
// Resultado final de un equipo
// ---------------------------------------------------------------------------

export const RESULT_LABELS: Record<TeamEntryResult, string> = {
  CHAMPION: "Campeón",
  RUNNER_UP: "Finalista",
  SEMIFINALIST: "Semifinalista",
  QUARTERFINALIST: "Cuartos",
  PLAYOFFS: "Playoffs",
  GROUP_STAGE: "Fase de grupos",
  PARTICIPATED: "Participó",
  WITHDRAWN: "Retirado",
  DISQUALIFIED: "Descalificado",
  UNKNOWN: "—",
};

/// Clases Tailwind para el badge de cada resultado.
export const RESULT_BADGE_CLASS: Record<TeamEntryResult, string> = {
  CHAMPION: "bg-amber-600/15 text-amber-800 ring-1 ring-inset ring-amber-600/30",
  RUNNER_UP: "bg-slate-500/15 text-slate-700 ring-1 ring-inset ring-slate-400/40",
  SEMIFINALIST: "bg-orange-600/15 text-orange-800 ring-1 ring-inset ring-orange-500/30",
  QUARTERFINALIST: "bg-sky-600/15 text-sky-800 ring-1 ring-inset ring-sky-500/30",
  PLAYOFFS: "bg-sky-600/15 text-sky-800 ring-1 ring-inset ring-sky-500/30",
  GROUP_STAGE: "bg-slate-600/10 text-slate-600 ring-1 ring-inset ring-slate-500/20",
  PARTICIPATED: "bg-slate-600/10 text-slate-600 ring-1 ring-inset ring-slate-500/20",
  WITHDRAWN: "bg-rose-600/15 text-rose-800 ring-1 ring-inset ring-rose-500/30",
  DISQUALIFIED: "bg-rose-600/15 text-rose-800 ring-1 ring-inset ring-rose-500/30",
  UNKNOWN: "bg-slate-400/10 text-slate-500 ring-1 ring-inset ring-slate-400/20",
};

/// Badge del resultado de una PARTIDA (victoria/derrota).
/// Tema claro: texto oscuro sobre un tinte suave, para que se lea bien.
export const WIN_BADGE_CLASS =
  "bg-emerald-600/15 text-emerald-800 ring-1 ring-inset ring-emerald-600/30";
export const LOSS_BADGE_CLASS =
  "bg-rose-600/15 text-rose-800 ring-1 ring-inset ring-rose-500/30";

export function resultLabel(result: TeamEntryResult): string {
  return RESULT_LABELS[result] ?? result;
}

// ---------------------------------------------------------------------------
// Premios
// ---------------------------------------------------------------------------

export const AWARD_CATEGORY_LABELS: Record<AwardCategory, string> = {
  MVP: "MVP",
  EXECUTOR: "Ejecutor",
  ASSISTANT: "Asistente",
  ALL_PRO: "All-Pro",
  PERFORMANCE: "Rendimiento",
  CUSTOM: "Especial",
};

export const AWARD_SCOPE_LABELS: Record<AwardScopeType, string> = {
  SPLIT: "Split",
  DIVISION: "División",
  MATCHDAY: "Jornada",
  OTHER: "Otro",
};
