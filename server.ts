import http from 'http';
import path from 'path';
import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { Server as SocketIOServer } from 'socket.io';
import { createServer as createViteServer } from 'vite';

import { checkDatabaseConnection, prisma } from './server/db.js';
import { seedDatabase } from './server/seed.js';
import { initSocketIO } from './server/socket/index.js';
import authRoutes from './server/routes/auth.js';
import eventRoutes from './server/routes/events.js';
import invitationRoutes from './server/routes/invitations.js';
import checkinRoutes from './server/routes/checkin.js';
import systemRoutes from './server/routes/system.js';

const PORT = 3000;
const HOST = '0.0.0.0';

async function startServer() {
  const app = express();
  const server = http.createServer(app);

  // Initialize Socket.IO
  const io = new SocketIOServer(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });
  initSocketIO(io);

  // Standard middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(cookieParser());
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

  // REST API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/events', eventRoutes);
  app.use('/api/invitations', invitationRoutes);
  app.use('/api/checkin', checkinRoutes);
  app.use('/api/system', systemRoutes);

  // Health probe
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', service: 'eventpass-api', timestamp: new Date().toISOString() });
  });

  // Check initial DB connectivity asynchronously without blocking server start
  checkDatabaseConnection().then(async ({ connected, error }) => {
    if (connected) {
      console.log('✔ Connected to SQLite Database via Prisma');
      try {
        const userCount = await prisma.user.count();
        if (userCount === 0) {
          console.log('Database empty. Running initial development seed...');
          await seedDatabase();
          console.log('✔ Database seeded successfully with initial organizer, staff, and summit event.');
        }
      } catch (seedErr) {
        console.error('Auto-seed check error:', seedErr);
      }
    } else {
      console.warn('⚠ Database not reachable at startup:', error);
      console.warn('EVENTPASS is running with active database diagnostics at /api/system/status');
    }
  });

  // Vite integration
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

  server.listen(PORT, HOST, () => {
    console.log(`EVENTPASS server listening on http://${HOST}:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
