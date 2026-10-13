# Despliegue y plan B

Tres formas de enseñar la aplicación, de más a menos dependiente de internet:

| Situación                                           | Comando               | Resultado                                                          |
| --------------------------------------------------- | --------------------- | ------------------------------------------------------------------ |
| Hay internet                                        | `npm run deploy`      | URL pública en Vercel, para abrir desde cualquier móvil.           |
| Sin internet, pero hay wifi local o punto de acceso | `npm run serve:lan`   | La versión de producción servida desde el portátil a la red local. |
| Sin red de ningún tipo                              | `npm run dev:offline` | Todo en el portátil, con las reglas de ejemplo.                    |

## Antes de desplegar por primera vez

1. Crea una cuenta gratuita en [vercel.com](https://vercel.com) (plan Hobby).
2. Inicia sesión desde el portátil; se abre el navegador para confirmar:

   ```bash
   npx vercel@62.2.0 login
   ```

3. Haz un primer despliegue de prueba (`npm run deploy`) y ábrelo desde el móvil. Así la
   caché de npm queda caliente y el proyecto ya existe en Vercel.

## Opción A: despliegue rápido, sin base de datos externa

```bash
npm run deploy
```

La primera vez crea el proyecto en tu cuenta (con el nombre de la carpeta) y tarda 2–4
minutos; las siguientes, 1–2. Al final escribe:

```text
  URL pública: https://ldu-reto.vercel.app
  Comprobación: servidor y base de datos operativos
```

Sin `DATABASE_URL`, la aplicación usa la base SQLite de ejemplo creada durante el build.
El servidor de Vercel es de solo lectura, así que trabaja sobre una copia temporal: **los
cambios duran mientras ese servidor sigue activo y luego se pierden**. La portada lo avisa.
Para una demo corta es suficiente; para datos que duren, usa la opción B.

## Opción B: datos persistentes con Postgres

1. Crea una base de datos Postgres gratuita en [Neon](https://neon.tech) o
   [Supabase](https://supabase.com), en una región europea (cerca de `cdg1`, París, donde
   corre la aplicación según `vercel.json`).
2. Copia su cadena de conexión `postgresql://…`. En Supabase, la de tipo «session» (puerto
   5432): la de tipo «transaction» (6543) no admite crear tablas.
3. En Vercel → tu proyecto → Settings → Environment Variables, añade para Production:
   - `DATABASE_URL` = la cadena de conexión.
   - `SEED_IF_EMPTY` = `true` (carga las reglas de ejemplo la primera vez).
4. `npm run deploy`. El build detecta Postgres, crea las tablas y carga las reglas.

Para usar esa misma base en local, pon la misma `DATABASE_URL` en `.env`.

## Variables de entorno en Vercel

Se configuran en Settings → Environment Variables (o con
`npx vercel@62.2.0 env add NOMBRE production`) y se aplican **en el siguiente despliegue**.
`.env` nunca se sube: `.vercelignore` lo excluye.

| Variable        | Cuándo                      | Valor                                   |
| --------------- | --------------------------- | --------------------------------------- |
| `DATABASE_URL`  | Opción B                    | Cadena de Postgres. Sin ella, opción A. |
| `SEED_IF_EMPTY` | Opción B, primer despliegue | `true`                                  |
| `LOG_LEVEL`     | Opcional                    | `info`                                  |

## Si algo falla

| Síntoma                                                    | Causa probable                                              | Qué hacer                                                                                                   |
| ---------------------------------------------------------- | ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| «No has iniciado sesión en Vercel»                         | Primera vez en este portátil                                | `npx vercel@62.2.0 login` y repetir.                                                                        |
| El build falla en `prisma db push`                         | `DATABASE_URL` mal copiada o con el pooler de transacciones | Revisar la cadena; en Supabase, la de puerto 5432.                                                          |
| El build falla en `npm ci` con «Missing: … from lock file» | `package-lock.json` hecho con un npm más antiguo que Vercel | En local: `npx npm@11.21.0 install --package-lock-only`, commit y repetir.                                  |
| La URL responde pero `/api/health` da 503                  | La base de datos no responde                                | Revisar `DATABASE_URL` y que la base esté activa (Neon la duerme tras inactividad: el primer acceso tarda). |
| Los datos desaparecen                                      | Opción A: base temporal                                     | Esperado; para persistir, opción B.                                                                         |
| El despliegue no termina o no hay internet                 | Red de la sede                                              | Pasar al plan B (abajo). Seguir enseñando, no depurar en directo.                                           |

## Plan B sin internet

**Red local (el móvil o el portátil del jurado en la misma wifi, o en el punto de acceso del
portátil):**

```bash
npm run serve:lan
```

Compila la versión de producción y la sirve en el puerto 3000. Escribe las direcciones con
el nombre de cada adaptador; usa la de **Wi-Fi** (o la del punto de acceso), no las de VPN o
máquinas virtuales. Si el móvil no carga, acepta el aviso del firewall de Windows para Node.js.

**Solo el portátil:**

```bash
npm run dev:offline
```

Arranca sin telemetría y recarga las reglas de ejemplo (sin borrar las demás).

## Comprobar el empaquetado sin desplegar

Vercel solo incluye en el servidor los archivos que detecta como necesarios. Para ver lo
mismo en local (por ejemplo, tras añadir una dependencia que lee archivos del disco):

```bash
NEXT_OUTPUT=standalone npm run build
```

genera `.next/standalone/` con exactamente lo incluido. Arrancándolo con `VERCEL=1` y sin
`DATABASE_URL` (`node .next/standalone/server.js`, tras copiar `.next/static` y `public`)
se comporta como la opción A: base de datos temporal, capas de Sevilla y todas las páginas.
