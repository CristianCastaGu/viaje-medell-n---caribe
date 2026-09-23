// Punto de entrada serverless para Vercel.
//
// El archivo se llama index.ts (no "[...path].ts") a propósito: en este
// proyecto, con framework:"vite" en vercel.json, Vercel no estaba
// reconociendo el catch-all por nombre de archivo — cualquier ruta con
// más de un segmento después de /api/ (ej. /api/trip/state) devolvía
// 404 de la plataforma, aunque /api/trip (un solo segmento) sí invocaba
// la función. En vez de depender de esa convención, vercel.json reescribe
// explícitamente TODO /api/* hacia esta función (ver "rewrites" ahí).
// Vercel preserva la URL original en el rewrite, así que el mismo Express
// app que se usa en local (src/server/app.ts) la enruta sin cambios.
//
// Variables de entorno requeridas en Vercel > Settings > Environment
// Variables: SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY (ver README.md).
import { createApiApp } from '../src/server/app.js';

const app = createApiApp();

export default app;
