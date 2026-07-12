import { NextResponse, type NextRequest } from "next/server";

/**
 * Candado del panel interno (/admin/*).
 *
 * El panel muestra los reportes de la comunidad INCLUYENDO el contacto
 * (Discord/email) de quien los envía: si quedara abierto sería una fuga de
 * datos personales. Se protege con Basic Auth por variables de entorno:
 *
 *   ADMIN_USER=...
 *   ADMIN_PASSWORD=...
 *
 * Importante: si NO están configuradas, el panel se CIERRA (no se abre). Fallar
 * cerrado es lo seguro — si algún día se olvida la variable en el hosting, el
 * panel queda inaccesible en vez de quedar expuesto a todo internet.
 */

/// Comparación en tiempo constante: no filtra por dónde deja de coincidir.
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

function unauthorized(): NextResponse {
  return new NextResponse("Autenticación requerida.", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="GoatyDB · panel interno", charset="UTF-8"',
    },
  });
}

export function middleware(req: NextRequest) {
  const user = process.env.ADMIN_USER;
  const password = process.env.ADMIN_PASSWORD;

  // Sin credenciales configuradas → panel cerrado (nunca abierto por descuido).
  if (!user || !password) {
    return new NextResponse(
      "Panel deshabilitado: faltan ADMIN_USER y ADMIN_PASSWORD en el entorno.",
      { status: 503 },
    );
  }

  const header = req.headers.get("authorization");
  if (header?.startsWith("Basic ")) {
    try {
      const decoded = atob(header.slice(6));
      const sep = decoded.indexOf(":");
      if (sep > 0) {
        const givenUser = decoded.slice(0, sep);
        const givenPass = decoded.slice(sep + 1);
        if (safeEqual(givenUser, user) && safeEqual(givenPass, password)) {
          return NextResponse.next();
        }
      }
    } catch {
      // Cabecera mal formada → tratamos como no autenticado.
    }
  }

  return unauthorized();
}

export const config = {
  matcher: ["/admin/:path*"],
};
