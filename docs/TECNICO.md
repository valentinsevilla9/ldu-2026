# Documentación técnica

Cómo está hecho AlertaCalle: comandos, estructura, API, motor de reglas, datos y accesibilidad.

## Puesta en marcha

Requisitos: Node.js 20.9 a 24 y npm. Sin Docker, sin base de datos externa y sin claves.

```bash
npm ci
npm run dev
```

Queda en <http://localhost:3000>. La primera vez, `npm run dev` crea la base de datos SQLite,
aplica la migración y carga las tres reglas de `data/rules.json`.

## Comandos

| Comando                | Qué hace                                                                   |
| ---------------------- | -------------------------------------------------------------------------- |
| `npm run dev`          | Arranca la aplicación en modo desarrollo.                                  |
| `npm run dev:offline`  | Plan B: arranca sin red y recarga las reglas de ejemplo.                   |
| `npm run build`        | Compila la versión de producción (`npm start` la sirve).                   |
| `npm run serve:lan`    | Plan B: compila y sirve en la red local (para abrirla desde el móvil).     |
| `npm test`             | Tests con Vitest y Testing Library.                                        |
| `npm run lint`         | ESLint y formato con Prettier.                                             |
| `npm run typecheck`    | Comprueba los tipos de TypeScript.                                         |
| `npm run seed`         | Carga (o recarga) las reglas de `data/rules.json`.                         |
| `npm run db:migrate`   | Tras cambiar `prisma/schema.prisma`: crea y aplica una migración.          |
| `npm run db:reset`     | Vacía la base de datos y vuelve a cargar las reglas.                       |
| `npm run screenshots`  | Captura las pantallas en `docs/screenshots/` para el README.               |
| `npm run docs:pending` | Lista los huecos `[…]` sin rellenar en README, one-pager, guion e `/idea`. |
| `npm run deploy`       | Despliega en Vercel (ver [DEPLOY.md](DEPLOY.md)).                          |

## Estructura

| Carpeta                         | Contenido                                                                   |
| ------------------------------- | --------------------------------------------------------------------------- |
| `app/`                          | Pantallas: `/` (inicio), `/en-vivo`, `/reglas`, `/alertas` e `/idea`.       |
| `app/api/`                      | `live`, `rules`, `alerts` y `health`.                                       |
| `modules/rules/`                | **Lo construido para el reto**: motor, servicio, esquemas y pantallas.      |
| `modules/sensors/`              | Simulador de lecturas y curva de temperatura del día real (`heat.ts`).      |
| `modules/sevilla/`              | Capas de Sevilla y mapa (Leaflet).                                          |
| `components/`, `hooks/`, `lib/` | Interfaz común (shadcn/ui), `useApi`, errores de API, base de datos y logs. |
| `prisma/`                       | Esquema (`Rule`, `AlertAck`) y migración.                                   |
| `data/rules.json`               | Las tres reglas de ejemplo.                                                 |
| `public/data/`                  | Datos abiertos usados, sin necesidad de internet.                           |

Los tests viven junto al código (`*.test.ts` en Node con base de datos de pruebas;
`*.test.tsx` en un navegador simulado).

## Motor de reglas (`modules/rules/engine.ts`)

Una regla es: tipo de sensor, comparación (`gte` o `lte`), umbral, duración mínima, franja
horaria y espera entre avisos. El motor recorre el día de cada sensor en pasos de 5 minutos:

```text
para cada sensor:
  racha = vacía
  para cada minuto de 00:00 a la hora actual, de 5 en 5:
    SI está en la franja Y la lectura cumple el umbral:
      empezar la racha si no había
      SI la racha dura ≥ duración Y aún no avisó en esta racha Y pasó la espera desde el último aviso:
        ENTONCES disparar alerta (regla, sensor, hora, lectura)
    SI NO:
      cortar la racha
```

Es una función pura sobre una función de lectura `read(sensor, minuto)`: aquí la da el
simulador; en producción, la serie temporal de los sensores reales. Las alertas no se guardan:
se recalculan, así que siempre corresponden a las reglas vigentes. Solo se guarda cuáles se han
atendido (`AlertAck`). Al dispararse, la acción se completa con datos reales: el refugio
(biblioteca o centro cívico) más cercano por distancia, o la estación de Sevici cercana con
al menos 5 bicis.

## API

| Método y ruta           | Respuesta                                                                |
| ----------------------- | ------------------------------------------------------------------------ |
| `GET /api/live?minute=` | Lecturas del distrito a ese minuto del día simulado y alertas hasta él.  |
| `GET /api/rules`        | Lista de reglas.                                                         |
| `POST /api/rules`       | 201 con la regla creada; 400 con el error de cada campo si no es válida. |
| `PATCH /api/rules/:id`  | 200 con la regla; solo cambia los campos enviados. 404 si no existe.     |
| `DELETE /api/rules/:id` | 204; 404 si no existe.                                                   |
| `POST /api/alerts/:id`  | 204: marca la alerta como atendida.                                      |
| `GET /api/health`       | 200 si servidor y base de datos responden; 503 si no.                    |

Todas las rutas usan `withApiHandler` (`lib/api/handler.ts`): errores con el mismo formato
(`VALIDATION_ERROR`, `INVALID_JSON`, `NOT_FOUND`, `CONFLICT`, `INTERNAL_ERROR`), mensajes en
español y una línea de log JSON por petición con su `requestId`.

## Datos

| Archivo                                                                                     | Origen                                                       | Uso                                     |
| ------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | --------------------------------------- |
| `public/data/sevilla/{tussam-paradas,sevici,bibliotecas,centros-civicos,distritos}.geojson` | Ayuntamiento de Sevilla, Centro de Datos Urbanos (5-10-2026) | Sensores, refugios y polígono de Triana |
| `public/data/sevilla/reciclaje.geojson`                                                     | © colaboradores de OpenStreetMap, ODbL (11-10-2026)          | Sensores de llenado                     |
| `public/data/abiertos/clima/{diario,anual}.csv`                                             | Open-Meteo, reanálisis ERA5, CC BY 4.0                       | Día real de calor y tendencia           |
| `public/data/abiertos/ine/distritos-indicadores.geojson`                                    | INE, Atlas de distribución de renta de los hogares, 2023     | Población y mayores de Triana           |

Un test (`modules/rules/engine.test.ts`) comprueba que la máxima y la mínima del día simulado
coinciden con `clima/diario.csv`.

## Accesibilidad

- Enlace «Saltar al contenido», foco visible y navegación completa con teclado.
- El estado de un sensor nunca va solo en color: icono y palabra (Normal, Aviso, Crítico).
- El mapa tiene una tabla equivalente con todas las lecturas.
- Cada campo del formulario tiene etiqueta; los errores se enlazan al campo (`aria-describedby`).
- Recuentos y avisos en regiones `aria-live`; se respetan `prefers-reduced-motion` y el tema
  claro u oscuro.

## Stack

Next.js (App Router) · TypeScript · Tailwind CSS · shadcn/ui (Radix) · zod · Prisma sobre
SQLite (o Postgres cambiando `DATABASE_URL`) · Leaflet (react-leaflet) · Vitest + Testing
Library · ESLint + Prettier.
