import crypto from 'crypto';
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';

function getEncryptionKey(): Buffer {
  return crypto
    .createHash('sha256')
    .update(process.env.JWT_SECRET || 'eventpass-jwt-secret-dev-2026-secure-key')
    .digest();
}

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

export function encryptCode(code: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(code.trim(), 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString('base64url'), authTag.toString('base64url'), encrypted.toString('base64url')].join('.');
}

export function decryptCode(value: string): string {
  const [ivValue, authTagValue, encryptedValue] = value.split('.');
  if (!ivValue || !authTagValue || !encryptedValue) throw new Error('Invalid encrypted verification code.');
  const decipher = crypto.createDecipheriv(
    ENCRYPTION_ALGORITHM,
    getEncryptionKey(),
    Buffer.from(ivValue, 'base64url')
  );
  decipher.setAuthTag(Buffer.from(authTagValue, 'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(encryptedValue, 'base64url')), decipher.final()]).toString('utf8');
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
