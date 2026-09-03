import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { handleApiRoute } from './src/api/routes';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

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

  // Vite middleware for development vs static dist for production
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
    console.log(`ViraLab full-stack server running on port ${PORT}`);
  });
}

startServer();
