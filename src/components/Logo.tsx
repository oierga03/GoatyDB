/* eslint-disable @next/next/no-img-element */

/// Logo de marca: el logo de Goaty Esports (GoatyDB es un proyecto suyo).
export function Logo({ size = 32 }: { size?: number }) {
  return (
    <img
      src="/goaty-logo.png"
      alt="Goaty Esports"
      width={size}
      height={size}
      className="rounded-lg object-contain"
      style={{ width: size, height: size }}
    />
  );
}
