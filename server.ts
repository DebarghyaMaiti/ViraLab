import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { handleApiRoute } from './src/api/routes';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// API endpoints
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

// Serve static frontend assets from dist in production
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));

app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`ViraLab full-stack server running on port ${PORT}`);
});
