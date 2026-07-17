"use client";

/// Botón de submit que pide confirmación antes de enviar el formulario.
/// Para acciones del panel que no tienen vuelta atrás (fusionar, borrar).
export function ConfirmButton({
  children,
  confirm,
  className = "",
}: {
  children: React.ReactNode;
  confirm: string;
  className?: string;
}) {
  return (
    <button
      type="submit"
      className={className}
      onClick={(e) => {
        if (!window.confirm(confirm)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
