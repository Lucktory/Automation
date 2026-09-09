"use client";

/**
 * Última red de seguridad del servidor.
 *
 * Sin ella, un fallo en producción se ve como «Application error: a server-side
 * exception has occurred» y un dígito — que no le dice nada a quien está
 * mirando la pantalla ni a quien tiene que arreglarlo.
 *
 * El `digest` sí sirve: es la clave con la que el error aparece en los registros
 * del proveedor, así que se muestra para poder buscarlo. El mensaje real NO se
 * muestra, porque puede contener rutas internas o fragmentos de configuración.
 *
 * Este archivo reemplaza el documento entero, así que tiene que traer sus
 * propias etiquetas `html` y `body`, y no puede usar traducciones: el fallo
 * puede haber ocurrido antes de que el idioma se resolviera.
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
          display: "grid",
          placeItems: "center",
          background: "#ffffff",
          color: "#0b0d10",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
        }}
      >
        <main style={{ maxWidth: "32rem", padding: "2rem", textAlign: "center" }}>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 600, margin: 0 }}>
            Algo se rompió de nuestro lado
          </h1>
          <p style={{ marginTop: "0.75rem", fontSize: "0.875rem", color: "#4a5561" }}>
            No es culpa tuya y no se perdió nada de lo que estabas haciendo.
            Vuelve a intentarlo; si sigue ocurriendo, escríbenos con el código de
            abajo.
          </p>

          {error.digest && (
            <p
              style={{
                marginTop: "1.25rem",
                fontSize: "0.75rem",
                color: "#79838f",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              Código del incidente: <code>{error.digest}</code>
            </p>
          )}

          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: "1.5rem",
              padding: "0.5rem 1.25rem",
              borderRadius: "0.5rem",
              border: "none",
              background: "#1b4fe0",
              color: "#ffffff",
              fontSize: "0.875rem",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Reintentar
          </button>
        </main>
      </body>
    </html>
  );
}
