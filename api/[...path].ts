// Punto de entrada serverless para Vercel.
// Cualquier request a /api/* (ej. /api/trip/state) llega aquí y Vercel
// preserva la URL original, así que el mismo Express app que se usa en
// local (src/server/app.ts) puede enrutarla sin cambios.
//
// Variables de entorno requeridas en Vercel > Settings > Environment
// Variables: SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY (ver README.md).
import { createApiApp } from '../src/server/app';

const app = createApiApp();

export default app;
