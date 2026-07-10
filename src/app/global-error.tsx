"use client";

/**
 * Límite de error de último recurso: se activa si falla el propio layout raíz.
 * Debe renderizar su propio <html>/<body>, por eso usa estilos en línea.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="es">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#eef4fc",
          color: "#12213b",
          fontFamily: "system-ui, sans-serif",
          textAlign: "center",
          padding: "1.5rem",
        }}
      >
        <div>
          <div style={{ fontSize: "3rem" }} aria-hidden>
            ⚠️
          </div>
          <h1 style={{ fontSize: "1.5rem", margin: "0.75rem 0 0.25rem" }}>
            Error inesperado
          </h1>
          <p style={{ color: "#566581", maxWidth: 420, margin: "0 auto" }}>
            La aplicación ha encontrado un problema. Vuelve a intentarlo.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: "1.25rem",
              padding: "0.55rem 1rem",
              borderRadius: "0.6rem",
              border: "none",
              cursor: "pointer",
              fontWeight: 600,
              color: "#ffffff",
              background: "linear-gradient(92deg, #0fb0c2, #2ba6f0)",
            }}
          >
            Reintentar
          </button>
        </div>
      </body>
    </html>
  );
}
