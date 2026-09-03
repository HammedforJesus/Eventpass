import crypto from 'crypto';
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

/**
 * Generate a cryptographically secure random invitation token (opaque string)
 */
export function generateInvitationToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Hash an invitation token with SHA-256 for fast indexed lookup
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token.trim()).digest('hex');
}

/**
 * Generate a cryptographically secure 6-digit verification code
 */
export function generate6DigitCode(): string {
  // Uses crypto.randomInt for uniform, unpredictable distribution [100000, 999999]
  return crypto.randomInt(100000, 1000000).toString();
}

/**
 * Hash a 6-digit verification code with bcrypt
 */
export async function hashCode(code: string): Promise<string> {
  return bcrypt.hash(code.trim(), SALT_ROUNDS);
}

/**
 * Compare submitted 6-digit code against stored bcrypt hash
 */
export async function verifyCode(code: string, hash: string): Promise<boolean> {
  return bcrypt.compare(code.trim(), hash);
}

/**
 * Hash a user password with bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Compare password with bcrypt hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
