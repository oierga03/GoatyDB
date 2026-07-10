"use client";
/* eslint-disable @next/next/no-img-element */

import { useState } from "react";

/// Avatar de miembro del equipo: usa la imagen de public/team/ si existe;
/// si el archivo aún no está (o falla), cae con elegancia a la inicial de color.
export function TeamAvatar({
  src,
  initial,
  tint,
  size = 64,
}: {
  src: string;
  initial: string;
  tint: string;
  size?: number;
}) {
  const [failed, setFailed] = useState(false);

  if (src && !failed) {
    return (
      <img
        src={src}
        alt=""
        width={size}
        height={size}
        onError={() => setFailed(true)}
        className="rounded-full object-cover"
        style={{
          width: size,
          height: size,
          border: `1px solid color-mix(in oklab, ${tint} 45%, transparent)`,
        }}
      />
    );
  }

  return (
    <div
      className="flex items-center justify-center rounded-full font-extrabold"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.4,
        color: tint,
        background: `color-mix(in oklab, ${tint} 16%, transparent)`,
        border: `1px solid color-mix(in oklab, ${tint} 45%, transparent)`,
      }}
      aria-hidden
    >
      {initial}
    </div>
  );
}
