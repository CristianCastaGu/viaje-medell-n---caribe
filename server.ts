import dotenv from 'dotenv';
import fs from 'fs';
import express from 'express';

// dotenv/config solo carga ".env" por defecto. Este proyecto usa ".env.local"
// (igual que Vite y Next.js), así que lo cargamos explícitamente, con
// ".env" como respaldo si algún día se usa ese nombre en vez de .env.local.
if (fs.existsSync('.env.local')) {
  dotenv.config({ path: '.env.local' });
} else {
  dotenv.config();
}
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { createApiApp } from './src/server/app.js';

const PORT = Number(process.env.PORT) || 3000;

async function startServer() {
  const app = express();

  // Rutas /api/trip/* (ahora respaldadas por Supabase en vez de un
  // archivo JSON local — ver src/server/app.ts y src/server/tripStore.ts).
  app.use(createApiApp());

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.warn(
        '\n⚠️  Faltan SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY en tu .env.local.\n' +
          '   Las rutas /api/trip/* fallarán hasta que las configures (ver README.md).\n'
      );
    }
  });
}

startServer();
