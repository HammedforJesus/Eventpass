import { Request, Response, NextFunction } from 'express';

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitRecord>();

// Clean up stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetAt) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

export function createRateLimiter(options: {
  windowMs: number;
  max: number;
  message?: string;
  keyGenerator?: (req: Request) => string;
}) {
  const { windowMs, max, message = 'Too many requests, please try again later.' } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    const forwarded = req.headers['x-forwarded-for'];
    const clientIp = typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : req.ip || req.socket.remoteAddress || 'unknown';
    const key = options.keyGenerator ? options.keyGenerator(req) : `${req.baseUrl || req.path}:${clientIp}`;
    const now = Date.now();

    const record = rateLimitStore.get(key);

    if (!record || now > record.resetAt) {
      rateLimitStore.set(key, {
        count: 1,
        resetAt: now + windowMs,
      });
      return next();
    }

    if (record.count >= max) {
      const retryAfter = Math.ceil((record.resetAt - now) / 1000);
      res.setHeader('Retry-After', retryAfter);
      return res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message,
          retryAfterSeconds: retryAfter,
        },
      });
    }

    record.count += 1;
    return next();
  };
}

// Code verification limiter: generous capacity for busy doors & test check-ins
export const codeVerificationLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 60, // 60 attempts/min allows high-frequency door scanning
  message: 'Too many verification code attempts. Please wait 60 seconds before trying again.',
  keyGenerator: (req) => {
    const forwarded = req.headers['x-forwarded-for'];
    const ip = typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : req.ip || 'unknown';
    const eventId = req.body?.eventId || 'unknown-event';
    return `verify-code:${eventId}:${ip}`;
  },
});

// Standard auth limiter: prevents brute force while allowing all office/wifi testers to register and log in
export const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 100, // 100 attempts per 15 mins prevents false positives
  message: 'Too many authentication attempts. Please try again in 15 minutes.',
  keyGenerator: (req) => {
    const forwarded = req.headers['x-forwarded-for'];
    const ip = typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : req.ip || 'unknown';
    const email = req.body?.email ? String(req.body.email).toLowerCase().trim() : '';
    return email ? `auth:${email}:${ip}` : `auth:${ip}`;
  },
});
