import { Router, Request, Response } from 'express';
import { checkDatabaseConnection, getDatabaseStatus } from '../db.js';
import { seedDatabase } from '../seed.js';

const router = Router();

/**
 * GET /api/health
 */
router.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

/**
 * GET /api/system/status
 */
router.get('/status', async (req: Request, res: Response) => {
  const { connected, error } = await checkDatabaseConnection();
  const dbStatus = getDatabaseStatus();

  res.json({
    success: true,
    data: {
      database: {
        connected,
        type: dbStatus.type,
        databaseUrlConfigured: dbStatus.databaseUrlConfigured,
        maskedUrl: dbStatus.maskedUrl,
        error,
      },
      serverTime: new Date().toISOString(),
      version: '1.0.0',
    },
  });
});

/**
 * POST /api/system/seed - Development seed trigger
 */
router.post('/seed', async (req: Request, res: Response) => {
  const { connected, error } = await checkDatabaseConnection();
  if (!connected) {
    return res.status(503).json({
      success: false,
      error: {
        code: 'DATABASE_UNAVAILABLE',
        message: 'Cannot run seed: MySQL database is not connected.',
        details: error,
      },
    });
  }

  try {
    const result = await seedDatabase();
    return res.json({
      success: true,
      data: result,
    });
  } catch (err: any) {
    console.error('Seed error:', err);
    return res.status(500).json({
      success: false,
      error: { code: 'SEED_FAILED', message: 'Failed to seed database.', details: err.message },
    });
  }
});

export default router;
