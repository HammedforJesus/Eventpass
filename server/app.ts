import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';

import authRoutes from './routes/auth.js';
import eventRoutes from './routes/events.js';
import invitationRoutes from './routes/invitations.js';
import checkinRoutes from './routes/checkin.js';
import systemRoutes from './routes/system.js';

export function createExpressApp(): express.Express {
  const app = express();

  // Parse incoming JSON and URL-encoded payloads
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(cookieParser());
  
  // CORS configuration
  app.use(
    cors({
      origin: true,
      credentials: true,
    })
  );

  // Security Headers
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  // Health probe mounted at both /api/health and /health
  const healthHandler = (req: express.Request, res: express.Response) => {
    res.json({
      status: 'ok',
      service: 'eventpass-api',
      timestamp: new Date().toISOString(),
      environment: process.env.VERCEL ? 'vercel-serverless' : 'node-server',
    });
  };
  app.get('/api/health', healthHandler);
  app.get('/health', healthHandler);

  // REST API Routes - mounted at both /api/* and /* to seamlessly support both standard servers and serverless proxies
  app.use('/api/auth', authRoutes);
  app.use('/auth', authRoutes);

  app.use('/api/events', eventRoutes);
  app.use('/events', eventRoutes);

  app.use('/api/invitations', invitationRoutes);
  app.use('/invitations', invitationRoutes);

  app.use('/api/checkin', checkinRoutes);
  app.use('/checkin', checkinRoutes);

  app.use('/api/system', systemRoutes);
  app.use('/system', systemRoutes);

  return app;
}
