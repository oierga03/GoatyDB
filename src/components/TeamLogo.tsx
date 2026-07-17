/* eslint-disable @next/next/no-img-element */

/// Logo de equipo. Usa `logoUrl` si existe; si no, un placeholder de marca:
/// tinte azul, la cabra de Goaty de fondo y las iniciales encima.
export function TeamLogo({
  name,
  shortName,
  logoUrl,
  size = 44,
}: {
  name: string;
  shortName?: string | null;
  logoUrl?: string | null;
  size?: number;
}) {
  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={`Logo de ${name}`}
        width={size}
        height={size}
        className="shrink-0 rounded-lg object-cover ring-1 ring-inset ring-[var(--color-border)]"
        style={{ width: size, height: size }}
      />
    );
  }

  const label = (shortName ?? name).slice(0, 3).toUpperCase();
  // A tamaño pequeño la cabra sería un borrón: solo la ponemos si hay sitio.
  const showGoat = size >= 30;

  return (
    <span
      className="relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[var(--color-sky)]/10 ring-1 ring-inset ring-[var(--color-sky)]/25"
      style={{ width: size, height: size }}
      aria-hidden
    >
      {showGoat && (
        <img
          src="/goat-mark.png"
          alt=""
          aria-hidden
          className="pointer-events-none absolute opacity-[0.18]"
          style={{ width: size * 0.72, height: size * 0.72, objectFit: "contain" }}
        />
      )}
      <span
        className="relative font-bold tracking-tight text-[var(--color-sky)]"
        style={{ fontSize: size * 0.3 }}
      >
        {label}
      </span>
    </span>
  );
}
