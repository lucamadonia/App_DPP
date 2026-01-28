import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
import { HTTPException } from 'hono/http-exception';

import { authMiddleware } from './middleware/auth';
import authRoutes from './routes/auth';
import productsRoutes from './routes/products';
import regulationsRoutes from './routes/regulations';

const app = new Hono();

// Global Middleware
app.use('*', logger());
app.use('*', prettyJSON());
app.use('*', cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
}));

// Error Handler
app.onError((err, c) => {
  console.error('Error:', err);

  if (err instanceof HTTPException) {
    return c.json({ error: err.message }, err.status);
  }

  return c.json({ error: 'Internal Server Error' }, 500);
});

// Health Check
app.get('/', (c) => {
  return c.json({
    name: 'DPP Manager API',
    version: '1.0.0',
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
});

// Public Routes
app.route('/api/v1/auth', authRoutes);

// Public Regulations (no auth required)
app.route('/api/v1/regulations', regulationsRoutes);

// Protected Routes
const protectedApp = new Hono();
protectedApp.use('*', authMiddleware);
protectedApp.route('/products', productsRoutes);

app.route('/api/v1', protectedApp);

// Public DPP Access (für Consumer-Zugriff ohne Auth)
app.get('/dpp/:gtin', async (c) => {
  const { gtin } = c.req.param();

  // TODO: Produkt aus DB laden und öffentliche Daten zurückgeben
  return c.json({
    message: 'Public DPP endpoint',
    gtin,
    note: 'This endpoint returns public product information without authentication',
  });
});

app.get('/dpp/:gtin/:serial', async (c) => {
  const { gtin, serial } = c.req.param();

  // TODO: Produkt aus DB laden
  return c.json({
    message: 'Public DPP endpoint with serial',
    gtin,
    serial,
  });
});

// 404 Handler
app.notFound((c) => {
  return c.json({ error: 'Not Found' }, 404);
});

// Start Server
const port = parseInt(process.env.PORT || '3001');

console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🚀 DPP Manager API Server                               ║
║                                                           ║
║   Server running at: http://localhost:${port}               ║
║                                                           ║
║   Endpoints:                                              ║
║   - GET  /                          Health check          ║
║   - POST /api/v1/auth/register      Register tenant       ║
║   - POST /api/v1/auth/login         Login                 ║
║   - GET  /api/v1/products           List products         ║
║   - GET  /api/v1/regulations/*      Regulations & News    ║
║   - GET  /dpp/:gtin                 Public DPP access     ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
`);

serve({
  fetch: app.fetch,
  port,
});
