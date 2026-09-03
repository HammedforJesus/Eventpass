import { PrismaClient } from '@prisma/client';

// Ensure DATABASE_URL is set; default to SQLite dev.db if unset or previously set to MySQL
if (!process.env.DATABASE_URL || process.env.DATABASE_URL.startsWith('mysql://')) {
  process.env.DATABASE_URL = 'file:./dev.db';
}

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

