import type { PlayerRole } from "@prisma/client";
import { roleLabel } from "@/lib/labels";

/**
 * Iconos de posición reproduciendo el set oficial de League of Legends:
 * Top    = cuadrado con la esquina superior-izquierda abierta + gema interior,
 * Jungla = mata de hierba,
 * Mid    = cuadrado atravesado por la diagonal,
 * Bot/ADC = cuadrado espejo (esquina inferior-derecha abierta),
 * Support = cruz alada.
 * Todos usan `currentColor`, así heredan el color/dorado del tema.
 */

// Anillo cuadrado (marco) — subpaths exterior + interior con fill even-odd.
const RING_OUTER = "M3.5 3.5H20.5V20.5H3.5Z";
const RING_INNER = "M7.5 7.5H16.5V16.5H7.5Z";

const PATHS: Record<PlayerRole, React.ReactNode> = {
  // Top: esquina superior-izquierda achaflanada + gema hacia abajo-derecha.
  TOP: (
    <>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M9 3.5H20.5V20.5H3.5V9Z M10.5 7.5H16.5V16.5H7.5V10.5Z"
        fill="currentColor"
      />
      <rect x="11.9" y="11.9" width="3.6" height="3.6" rx="0.7" fill="currentColor" />
    </>
  ),
  // Jungla: mata de hierba (dos briznas altas en V + briznas de relleno).
  JUNGLE: (
    <g fill="currentColor">
      <path d="M10.6 20Q8.4 12 9 3.8Q11.4 11.5 12 19.6Z" />
      <path d="M13.4 20Q15.6 12 15 3.8Q12.6 11.5 12 19.6Z" />
      <path d="M11 19.8Q11.4 13 12 6.5Q12.6 13 13 19.8Z" />
      <path d="M10.5 19.6Q7.5 14.5 5.5 9.5Q8.8 15 11.6 19Z" />
      <path d="M13.5 19.6Q16.5 14.5 18.5 9.5Q15.2 15 12.4 19Z" />
    </g>
  ),
  // Mid: marco cuadrado atravesado por la diagonal.
  MID: (
    <>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d={`${RING_OUTER} ${RING_INNER}`}
        fill="currentColor"
      />
      <path
        d="M5 5 19 19"
        fill="none"
        stroke="currentColor"
        strokeWidth="3.4"
        strokeLinecap="round"
      />
    </>
  ),
  // Bot / ADC: espejo del top (esquina inferior-derecha abierta + gema arriba-izq).
  ADC: (
    <>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M3.5 3.5H20.5V15L15 20.5H3.5Z M7.5 7.5H16.5V13L13 16.5H7.5Z"
        fill="currentColor"
      />
      <rect x="8.5" y="8.5" width="3.6" height="3.6" rx="0.7" fill="currentColor" />
    </>
  ),
  // Support: cruz alada.
  SUPPORT: (
    <g fill="currentColor">
      <path d="M12 3 13.7 4.1 13.7 5.7 12 6.7 10.3 5.7 10.3 4.1Z" />
      <path d="M10.7 7H13.3V14.6L12 19.6 10.7 14.6Z" />
      <path d="M10.7 8 3.6 5.4 6.7 8.9 4.3 8.9 7.5 11.3 10.7 11.1Z" />
      <path d="M13.3 8 20.4 5.4 17.3 8.9 19.7 8.9 16.5 11.3 13.3 11.1Z" />
    </g>
  ),
  // Flex / polivalente: marco cuadrado con gema centrada.
  FLEX: (
    <>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d={`${RING_OUTER} ${RING_INNER}`}
        fill="currentColor"
      />
      <rect x="10.2" y="10.2" width="3.6" height="3.6" rx="0.7" fill="currentColor" />
    </>
  ),
  UNKNOWN: <rect x="8" y="11" width="8" height="2" rx="1" fill="currentColor" />,
};

export function RoleIcon({
  role,
  size = 18,
  className = "",
}: {
  role: PlayerRole;
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      role="img"
      aria-label={roleLabel(role)}
      className={className}
    >
      {PATHS[role] ?? PATHS.UNKNOWN}
    </svg>
  );
}
