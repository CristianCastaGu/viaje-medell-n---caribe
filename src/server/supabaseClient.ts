import { createClient, SupabaseClient } from '@supabase/supabase-js';

// IMPORTANTE: este archivo SOLO debe importarse desde código de servidor
// (server.ts, src/server/*, api/*). Nunca desde src/App.tsx ni desde
// ningún componente en src/components — eso filtraría la service_role
// key (que tiene acceso total a la base de datos, sin RLS) al bundle
// del navegador.

let cachedClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (cachedClient) return cachedClient;

  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      'Faltan las variables de entorno SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY. ' +
        'Configúralas en .env.local (desarrollo) o en Vercel > Settings > Environment Variables (producción). ' +
        'Consulta el README para el paso a paso.'
    );
  }

  cachedClient = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return cachedClient;
}
