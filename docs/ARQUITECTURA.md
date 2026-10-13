# Arquitectura de Sevilla Activa

El piloto usa ubicaciones reales y lecturas, habilitación, horarios, plazas y actuaciones
simulados. El agente es una simulación determinista con herramientas limitadas; no hay un
modelo de IA conectado. Las confirmaciones solo cambian esta demo.

```mermaid
flowchart TD
    subgraph UI[Interfaz Next.js · TypeScript · Tailwind · shadcn/ui]
        HOME[Inicio: problema, público, casos, contexto y fuentes]
        APP[App del vecino: refugios, reciclaje y Sevici]
        ADMIN[Gestión: actuaciones, sensores, reglas y alertas]
    end
    subgraph SERVER[Servidor Next.js]
        API[API con validación Zod y errores en español]
        SIM[Reloj y simulador determinista]
        ENGINE[Motor: umbral, duración, horario y espera]
        ALERTS[Alertas y agrupación de tareas]
        AGENT[Agente simulado: consultar, comprobar y proponer]
        CHECK[Validación de restricciones]
        ACTION[Confirmación humana de actuaciones]
        METRIC[Comparación sobre las mismas solicitudes]
    end
    FILES[GeoJSON y CSV locales: Ayuntamiento, OSM, INE y Open-Meteo]
    DB[(Prisma · SQLite: reglas, confirmaciones y actuaciones por sesión)]
    APP --> API
    ADMIN --> API
    FILES --> HOME
    FILES --> SIM
    API --> SIM
    SIM --> ENGINE
    DB --> ENGINE
    ENGINE --> ALERTS
    ALERTS --> ADMIN
    API --> AGENT
    SIM --> AGENT
    FILES --> AGENT
    DB --> AGENT
    AGENT --> CHECK
    CHECK --> APP
    APP -->|Solicitud| ADMIN
    ADMIN --> ACTION
    ACTION --> DB
    DB -->|Disponibilidad actualizada| API
    API --> METRIC
    METRIC --> APP
    METRIC --> ADMIN
```

## Flujo de datos

1. Los archivos locales aportan ubicación y material documentado. El histórico climático
   aporta máximas y mínimas; la curva horaria y el recargo de calle son hipótesis simuladas.
2. El reloj fija el minuto. El simulador produce lecturas reproducibles; las actuaciones de
   la sesión modifican la disponibilidad del piloto desde su minuto de confirmación.
3. El motor evalúa cada regla y genera alertas. La planificación de la app se solicita cuando
   el vecino busca una alternativa; las alertas no ejecutan actuaciones físicas.
4. El agente simulado consulta recursos próximos y comprueba apertura y plazas de refugios,
   material y llenado del reciclaje o bicicletas disponibles. Las distancias son en línea recta.
5. Si encuentra una opción válida, explica su propuesta. Si no, prepara una solicitud cuando
   hay un recurso compatible; si tampoco lo hay, informa sin inventar una alternativa.
6. El responsable confirma una actuación. SQLite conserva sesión, recurso, operación y minuto.
   Una nueva consulta refleja apertura, vaciado o reposición. Una sesión nueva parte del escenario
   base; rebobinar excluye actuaciones posteriores.
7. La métrica compara el mismo conjunto de solicitudes, minuto y radio. Cuenta las que tienen
   alternativa válida usando la opción más cercana sin disponibilidad frente a comprobarla.
   Es un resultado de simulación, no un incremento real de reciclaje ni de protección sanitaria.

## Lógica principal

```mermaid
flowchart TD
    READING[Lectura simulada] --> CONDITION{Regla dentro del horario y condición cumplida?}
    CONDITION -->|No| RESET[Reiniciar duración continua]
    CONDITION -->|Sí| TIME{Duración mínima alcanzada?}
    TIME -->|No| WAIT[Esperar siguiente lectura]
    TIME -->|Sí| ONCE{Sin aviso en este episodio y espera cumplida?}
    ONCE -->|No| WAIT
    ONCE -->|Sí| ALERT[Generar alerta para el responsable]
    QUERY[Vecino solicita alternativa] --> TOOLS[Consultar recursos y comprobar restricciones]
    TOOLS --> VALID{Alternativa válida dentro de la distancia?}
    VALID -->|Sí| RECOMMEND[Recomendar y explicar]
    VALID -->|No| CANDIDATE{Recurso compatible que admite actuación?}
    CANDIDATE -->|No| NONE[Informar de falta de alternativa]
    CANDIDATE -->|Sí| REQUEST[Registrar solicitud simulada]
    REQUEST --> APPROVE[Responsable confirma apertura, recogida o reposición]
    APPROVE --> UPDATE[Persistir actuación y actualizar disponibilidad]
    UPDATE --> QUERY
```

## Límites del piloto

El rol de gestión es demostrativo, sin autenticación de producción. La habilitación de todos
los equipamientos como candidatos es ficticia. En producción se necesitan acuerdos de datos,
verificación de accesibilidad y protocolos, permisos de gestión y un modelo de IA validado
si se sustituye el planificador simulado. No se usan datos de relojes ni constantes médicas.

Verificación: `npm test`, `npm run typecheck`, `npm run build` y
`npx tsx scripts/verify-pilot.ts` (requiere Chrome o Edge instalado y servidor arrancado).
