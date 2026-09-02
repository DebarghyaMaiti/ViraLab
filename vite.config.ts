import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, Plugin } from 'vite';
import { handleApiRoute } from './src/api/routes';

function apiServerPlugin(): Plugin {
  return {
    name: 'viralab-api-server',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url || '';
        if (url.startsWith('/api/')) {
          let bodyData = '';
          req.on('data', (chunk) => {
            bodyData += chunk;
          });
          req.on('end', async () => {
            try {
              let parsedBody = {};
              if (bodyData) {
                try {
                  parsedBody = JSON.parse(bodyData);
                } catch {
                  parsedBody = {};
                }
              }

              const pathOnly = url.split('?')[0];
              const response = await handleApiRoute({
                method: req.method || 'GET',
                path: pathOnly,
                body: parsedBody,
                query: {},
              });

              res.statusCode = response.status;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(response.body));
            } catch (err: any) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(
                JSON.stringify({
                  error: err.message || 'Internal API Server Error',
                  errorId: `API-ERR-${Date.now()}`,
                })
              );
            }
          });
          return;
        }
        next();
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), apiServerPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
