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

// Ensure database is ready before processing API routes on serverless
app.use(async (req, res, next) => {
  try {
    await ensureDatabaseReady();
  } catch (err) {
    console.warn('[Vercel Middleware] Error preparing DB:', err);
  }
  next();
});

export default app;
