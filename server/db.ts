import { PrismaClient } from '@prisma/client';

function resolveDatabaseUrl(): string {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    throw new Error('DATABASE_URL must point to a persistent PostgreSQL database.');
  }
  if (databaseUrl.startsWith('file:')) {
    throw new Error('SQLite DATABASE_URL is not supported. Vercel requires a persistent PostgreSQL database.');
  }
  return databaseUrl;
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
  const rawUrl = process.env.DATABASE_URL || '';
  const maskedUrl = rawUrl.replace(/(postgres(?:ql)?:\/\/[^:]+:)([^@]+)(@.+)/, '$1******$3');

  return {
    connected: isDbConnected,
    type: 'postgresql' as const,
    databaseUrlConfigured: Boolean(process.env.DATABASE_URL),
    maskedUrl: maskedUrl || 'Not configured in environment',
    error: dbLastError,
  };
}

