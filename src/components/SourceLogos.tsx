/* eslint-disable @next/next/no-img-element */

/// Logos de la FUENTE de los datos (Circuito Tormenta / Hextech Series).
/// Se usan solo para atribuir el origen de los datos, nunca para dar a entender
/// que GoatyDB tenga relación oficial con ellos (ver el aviso del pie).

export function CircuitoTormentaLogo({
  height = 20,
  className = "",
}: {
  height?: number;
  className?: string;
}) {
  return (
    <img
      src="/brand/circuito-tormenta.png"
      alt="Circuito Tormenta"
      className={`w-auto ${className}`}
      style={{ height }}
    />
  );
}

export function HextechSeriesBanner({ className = "" }: { className?: string }) {
  return (
    <img
      src="/brand/hextech-series.jpg"
      alt="Hextech Series"
      className={`w-full object-cover ${className}`}
    />
  );
}
