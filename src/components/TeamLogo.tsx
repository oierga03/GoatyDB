/* eslint-disable @next/next/no-img-element */

/// Logo de equipo. Usa `logoUrl` si existe; si no, un placeholder con el shortName.
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
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-lg bg-[var(--color-surface-2)] font-bold tracking-tight text-[var(--color-muted)] ring-1 ring-inset ring-[var(--color-border)]"
      style={{ width: size, height: size, fontSize: size * 0.3 }}
      aria-hidden
    >
      {label}
    </span>
  );
}
