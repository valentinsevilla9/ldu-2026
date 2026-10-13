export function Architecture() {
  return (
    <figure
      className="flex flex-col gap-4 rounded-xl border bg-muted/20 p-4 sm:p-6"
      aria-labelledby="architecture-caption"
    >
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { title: "Inicio", text: "Explicación del reto y fuentes" },
          { title: "App del vecino", text: "Solicitar una alternativa" },
          { title: "Gestión", text: "Configurar reglas y confirmar actuaciones" },
        ].map((item) => (
          <div key={item.title} className="rounded-lg border bg-background p-4">
            <h3 className="font-semibold">{item.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{item.text}</p>
          </div>
        ))}
      </div>
      <p className="text-center text-sm" aria-hidden="true">
        ↓ Peticiones y respuestas ↓
      </p>
      <div className="rounded-lg border-2 border-primary/40 bg-background p-4">
        <h3 className="text-center font-semibold">API de Next.js · validación Zod</h3>
        <p className="mt-1 text-center text-sm text-muted-foreground">
          Valida entradas y devuelve propuestas o errores en español
        </p>
      </div>
      <p className="text-center text-sm" aria-hidden="true">
        ↓ Lecturas y consultas ↓
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { title: "Simulador", text: "El reloj fija las lecturas y la disponibilidad del piloto" },
          { title: "Motor de reglas", text: "Umbral + duración + horario → alerta" },
          { title: "Agente simulado", text: "Consulta recursos → comprueba condiciones → propone" },
        ].map((item) => (
          <div key={item.title} className="rounded-lg border bg-background p-4">
            <h3 className="font-semibold">{item.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{item.text}</p>
          </div>
        ))}
      </div>
      <p className="text-center text-sm" aria-hidden="true">
        ↕ Datos y actuaciones confirmadas ↕
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border bg-background p-4">
          <h3 className="font-semibold">Archivos locales · GeoJSON y CSV</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Ayuntamiento, OpenStreetMap, INE y Open-Meteo
          </p>
        </div>
        <div className="rounded-lg border bg-background p-4">
          <h3 className="font-semibold">Prisma · SQLite</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Reglas, solicitudes y actuaciones por sesión y minuto
          </p>
        </div>
      </div>
      <figcaption id="architecture-caption" className="text-sm text-muted-foreground">
        La app pide una propuesta; el panel municipal recibe alertas y solicitudes. Solo una
        confirmación humana cambia la disponibilidad simulada. El motor detecta condiciones; el
        agente planifica alternativas. Ninguna actuación sale de la demo.
      </figcaption>
    </figure>
  );
}
