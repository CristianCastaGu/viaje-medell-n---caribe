<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Viaje Medellín - Caribe 🌴🌊

Centro de mando para el viaje grupal Medellín - Caribe (9-18 de octubre): itinerario
interactivo, sugerencias, encuestas y control de préstamos entre el grupo.

La base de datos vive en **Supabase** (Postgres), así que todo lo que agrega el
admin o el grupo (itinerario, sugerencias, votos, préstamos) se guarda de verdad
y se ve igual para todos, tanto en local como en producción (Vercel).

## 1. Crear el proyecto en Supabase

1. Entra a [supabase.com](https://supabase.com), crea una cuenta/proyecto nuevo
   (elige una región cercana, ej. `us-east-1`, y una contraseña de base de datos —
   guárdala, no se vuelve a mostrar).
2. Cuando el proyecto termine de aprovisionarse, ve a **SQL Editor** → **New query**.
3. Abre el archivo [`supabase/schema.sql`](supabase/schema.sql) de este repo,
   copia todo su contenido, pégalo en el editor y dale **Run**.
   Esto crea las 6 tablas (`travelers`, `itinerary_days`, `suggestions`, `polls`,
   `loans`, `trip_config`) con Row Level Security activado.
4. Ve a **Project Settings** → **API**. Copia:
   - **Project URL** → esto es `SUPABASE_URL`.
   - **service_role** key (la secreta, NO la `anon public`) → esto es
     `SUPABASE_SERVICE_ROLE_KEY`.

> ⚠️ La `service_role` key tiene acceso total a la base sin restricciones.
> Solo se usa del lado del servidor (nunca se envía al navegador) — por eso
> las rutas siguen siendo `/api/trip/*` en vez de que el frontend hable
> directo con Supabase.

## 2. Correr en local

**Requisitos:** Node.js 18+

1. Instala dependencias:
   ```
   npm install
   ```
2. Copia `.env.example` a `.env.local` y pega tus llaves de Supabase:
   ```
   SUPABASE_URL="https://tu-proyecto.supabase.co"
   SUPABASE_SERVICE_ROLE_KEY="ey...."
   ```
3. Corre la app:
   ```
   npm run dev
   ```
4. Abre `http://localhost:3000`. La primera vez que se pida cualquier dato
   (`/api/trip/state`), el backend siembra automáticamente el itinerario y
   datos de ejemplo definidos en `src/defaultData.ts` — revisa el **Table
   Editor** de Supabase y deberías ver las filas aparecer.

## 3. Desplegar en Vercel

1. Conecta el repo de GitHub en [vercel.com/new](https://vercel.com/new)
   (framework detectado: Vite).
2. En **Settings → Environment Variables** agrega, para *Production* y
   *Preview*:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - (opcional) `TRIP_GROUP_SECRET` / `TRIP_ADMIN_PASSWORD` si quieres
     cambiar las palabras clave sin tocar código.
3. Redeploy. Vercel construye el frontend (`vite build`) y publica
   automáticamente la función serverless en [`api/[...path].ts`](api/%5B...path%5D.ts),
   que maneja todas las rutas `/api/trip/*` contra Supabase.
4. Verifica: abre la URL de Vercel, entra con la palabra secreta, agrega
   una sugerencia o un préstamo, recarga la página — debe seguir ahí (y
   debe verse también desde el Table Editor de Supabase).

## Credenciales de acceso a la app

| Acceso | Palabra clave por defecto |
|---|---|
| Grupo general | `Desapareceresopcional` |
| Admin | `adminSabana` |

Puedes cambiarlas sin tocar código con las variables de entorno
`TRIP_GROUP_SECRET` y `TRIP_ADMIN_PASSWORD` (ver `.env.example`).

## Arquitectura

```
src/
  App.tsx, components/…      → Frontend (React + Vite), sin cambios de UI
  api.ts                     → Llama a /api/trip/* (igual que antes)
  server/
    supabaseClient.ts        → Cliente de Supabase (solo servidor, service_role key)
    tripStore.ts             → Toda la lógica de lectura/escritura en Postgres
    app.ts                   → Rutas Express /api/trip/* (usa tripStore)
server.ts                    → Entrada local: Express + Vite dev middleware
api/[...path].ts             → Entrada Vercel: mismo Express app, como función serverless
supabase/schema.sql          → DDL para crear las tablas en Supabase
```

El contrato de datos entre frontend y backend (`TripState` en `src/types.ts`)
no cambió, así que ningún componente de `src/components` necesitó editarse.
