import type { Request, Response } from 'express';
import { createExpressApp } from '../server/app.js';
import { checkDatabaseConnection, prisma } from '../server/db.js';
import { seedDatabase } from '../server/seed.js';

const app = createExpressApp();

let isInitialized = false;

// Cold-start database check and automatic seeding on Vercel
async function ensureDatabaseReady() {
  if (isInitialized) return;
  try {
    const { connected } = await checkDatabaseConnection();
    if (connected) {
      const userCount = await prisma.user.count();
      if (userCount === 0) {
        await seedDatabase();
      }
    }
    isInitialized = true;
  } catch (err) {
    console.warn('[Vercel Serverless] DB initialization warning:', err);
  }
}

export default async function handler(req: Request, res: Response) {
  await ensureDatabaseReady();
  return (app as any)(req, res);
}
