import { Router, Request, Response } from 'express';
import { prisma, checkDatabaseConnection } from '../db.js';
import { hashPassword, verifyPassword } from '../utils/crypto.js';
import { generateToken, requireAuth, AuthenticatedRequest } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimit.js';
import { logAudit } from '../utils/audit.js';

const router = Router();

// Set cookie helper
function setAuthCookie(res: Response, token: string) {
  res.cookie('eventpass_token', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/',
  });
}

/**
 * POST /api/auth/register
 */
router.post('/register', authLimiter, async (req: Request, res: Response) => {
  const { name, email, password, confirmPassword } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({
      success: false,
      error: { code: 'MISSING_FIELDS', message: 'Full name, email, and password are required.' },
    });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({
      success: false,
      error: { code: 'PASSWORD_MISMATCH', message: 'Passwords do not match.' },
    });
  }

  if (password.length < 8) {
    return res.status(400).json({
      success: false,
      error: { code: 'WEAK_PASSWORD', message: 'Password must be at least 8 characters long.' },
    });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_EMAIL', message: 'Please provide a valid email address.' },
    });
  }

  const { connected, error } = await checkDatabaseConnection();
  if (!connected) {
    return res.status(503).json({
      success: false,
      error: {
        code: 'DATABASE_UNAVAILABLE',
        message: 'MySQL database is not connected. Please configure DATABASE_URL in environment.',
        details: error,
      },
    });
  }

  try {
    const existing = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        error: { code: 'EMAIL_IN_USE', message: 'An account with this email already exists.' },
      });
    }

    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.toLowerCase().trim(),
        passwordHash,
        role: 'ORGANIZER',
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    const token = generateToken({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role as 'ORGANIZER' | 'STAFF',
    });

    setAuthCookie(res, token);

    await logAudit({
      actorId: user.id,
      action: 'USER_REGISTERED',
      targetType: 'User',
      targetId: user.id,
      metadata: { email: user.email, role: user.role },
      req,
    });

    return res.status(201).json({
      success: true,
      data: {
        user,
        token,
      },
    });
  } catch (err: any) {
    console.error('Registration error:', err);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to complete registration.' },
    });
  }
});

/**
 * POST /api/auth/login
 */
router.post('/login', authLimiter, async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      error: { code: 'MISSING_FIELDS', message: 'Email and password are required.' },
    });
  }

  const { connected, error } = await checkDatabaseConnection();
  if (!connected) {
    return res.status(503).json({
      success: false,
      error: {
        code: 'DATABASE_UNAVAILABLE',
        message: 'MySQL database is not connected. Please configure DATABASE_URL in environment.',
        details: error,
      },
    });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) {
      await logAudit({
        action: 'FAILED_LOGIN_ATTEMPT',
        metadata: { email: email.toLowerCase().trim(), reason: 'USER_NOT_FOUND' },
        req,
      });
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' },
      });
    }

    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      await logAudit({
        actorId: user.id,
        action: 'FAILED_LOGIN_ATTEMPT',
        metadata: { email: user.email, reason: 'WRONG_PASSWORD' },
        req,
      });
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' },
      });
    }

    const token = generateToken({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role as 'ORGANIZER' | 'STAFF',
    });

    setAuthCookie(res, token);

    await logAudit({
      actorId: user.id,
      action: 'USER_LOGIN',
      targetType: 'User',
      targetId: user.id,
      metadata: { email: user.email, role: user.role },
      req,
    });

    return res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          createdAt: user.createdAt,
        },
        token,
      },
    });
  } catch (err: any) {
    console.error('Login error:', err);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to process login.' },
    });
  }
});

/**
 * POST /api/auth/logout
 */
router.post('/logout', (req: Request, res: Response) => {
  res.clearCookie('eventpass_token', {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    path: '/',
  });
  return res.json({
    success: true,
    data: { message: 'Logged out successfully' },
  });
});

/**
 * GET /api/auth/me
 */
router.get('/me', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { connected } = await checkDatabaseConnection();
  if (!connected) {
    // Return decoded token info if db is disconnected so user identity remains visible
    return res.json({
      success: true,
      data: {
        user: req.user,
        databaseConnected: false,
      },
    });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'User profile not found.' },
      });
    }

    const currentToken =
      (req.headers.authorization?.startsWith('Bearer ')
        ? req.headers.authorization.slice(7)
        : null) || req.cookies?.eventpass_token;

    return res.json({
      success: true,
      data: {
        user,
        token: currentToken,
        databaseConnected: true,
      },
    });
  } catch (err) {
    return res.json({
      success: true,
      data: {
        user: req.user,
        databaseConnected: false,
      },
    });
  }
});

export default router;
