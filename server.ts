import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { handleApiRoute } from './src/api/routes';

dotenv.config();

async function startServer() {
  const isProduction =
    process.env.NODE_ENV === 'production' ||
    (typeof __filename !== 'undefined' && __filename.endsWith('.cjs'));

  if (isProduction) {
    process.env.NODE_ENV = 'production';
  }

  const app = express();
  // PORT resolution:
  // In the development container, DEFAULT_APP_PORT is 3000 while NGINX listens on 8080.
  // In Cloud Run deployment, Cloud Run injects PORT (e.g. 3000 or 8080) directly into the environment.
  const PORT = process.env.DEFAULT_APP_PORT
    ? parseInt(process.env.DEFAULT_APP_PORT, 10)
    : (process.env.PORT ? parseInt(process.env.PORT, 10) : 3000);

  app.use(express.json({ limit: '20mb' }));
  app.use(express.urlencoded({ extended: true, limit: '20mb' }));

  // API endpoints FIRST
  app.all('/api/*', async (req, res) => {
    try {
      const pathOnly = req.path;
      const response = await handleApiRoute({
        method: req.method,
        path: pathOnly,
        body: req.body,
        query: req.query as Record<string, string>,
      });

      res.status(response.status).json(response.body);
    } catch (err: any) {
      res.status(500).json({
        error: err.message || 'Internal Server Error',
        errorId: `SRV-ERR-${Date.now()}`,
      });
    }
  });

  const server = http.createServer(app);

  // Vite middleware for development vs static dist for production
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: { server },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
    }
    app.get('*', (req, res) => {
      const indexPath = path.join(distPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).send('Application build not found. Please run npm run build.');
      }
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`ViraLab server running on port ${PORT} (mode: ${isProduction ? 'production' : 'development'})`);
  });

  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`[ViraLab Server] Notice: Port ${PORT} is already in use by an existing server instance. Serving via existing active process.`);
    } else {
      console.error('[ViraLab Server] Unhandled server error:', err);
      process.exit(1);
    }
  });
}

startServer();
