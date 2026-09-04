import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

// Resolve database URL, ensuring that serverless platforms (e.g. Vercel) have a writable SQLite file in /tmp
function resolveDatabaseUrl(): string {
  const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
  
  if (isServerless) {
    const tmpPath = path.join('/tmp', 'dev.db');
    if (!fs.existsSync(tmpPath)) {
      const candidates = [
        path.join(process.cwd(), 'prisma', 'dev.db'),
        path.join(process.cwd(), 'dev.db'),
      ];
      for (const src of candidates) {
        if (fs.existsSync(src)) {
          try {
            fs.copyFileSync(src, tmpPath);
            console.log(`[DB] Copied SQLite database to writable path: ${tmpPath}`);
            break;
          } catch (copyErr) {
            console.warn('[DB] Could not copy SQLite database to /tmp:', copyErr);
          }
        }
      }
    }
    return `file:${tmpPath}`;
  }

  if (!process.env.DATABASE_URL || process.env.DATABASE_URL.startsWith('mysql://')) {
    return 'file:./dev.db';
  }

  return process.env.DATABASE_URL;
}

process.env.DATABASE_URL = resolveDatabaseUrl();

declare global {
  // eslint-disable-next-line no-var
  var __prismaClient: PrismaClient | undefined;
}

export const prisma =
  global.__prismaClient ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  global.__prismaClient = prisma;
}

let isDbConnected = false;
let dbLastError: string | null = null;
let lastCheckTime = 0;

export async function checkDatabaseConnection(): Promise<{
  connected: boolean;
  error: string | null;
}> {
  const now = Date.now();
  // Cache check for 5 seconds to prevent spamming
  if (now - lastCheckTime < 5000 && isDbConnected) {
    return { connected: isDbConnected, error: dbLastError };
  }

  lastCheckTime = now;
  try {
    // Attempt quick raw ping
    await prisma.$queryRaw`SELECT 1`;
    isDbConnected = true;
    dbLastError = null;
    return { connected: true, error: null };
  } catch (err: any) {
    isDbConnected = false;
    dbLastError = err.message || 'Unable to connect to database.';
    return { connected: false, error: dbLastError };
  }
}

export function getDatabaseStatus() {
  const rawUrl = process.env.DATABASE_URL || 'file:./dev.db';
  const isSqlite = rawUrl.startsWith('file:');
  // Mask password for security if remote URL
  const maskedUrl = isSqlite
    ? rawUrl
    : rawUrl.replace(/(mysql:\/\/[^:]+:)([^@]+)(@.+)/, '$1******$3');

  return {
    connected: isDbConnected,
    type: (isSqlite ? 'sqlite' : 'mysql') as 'sqlite' | 'mysql',
    databaseUrlConfigured: Boolean(process.env.DATABASE_URL),
    maskedUrl: maskedUrl || 'Not configured in environment',
    error: dbLastError,
  };
}

