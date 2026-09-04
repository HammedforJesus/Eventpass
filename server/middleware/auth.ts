import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma, checkDatabaseConnection } from '../db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'eventpass-jwt-secret-dev-2026-secure-key';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: 'ORGANIZER' | 'STAFF';
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

export function generateToken(user: AuthUser): string {
  return jwt.sign(
    {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export function verifyToken(token: string): AuthUser | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthUser;
  } catch {
    return null;
  }
}

/**
 * Middleware requiring authenticated user
 */
export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const token =
    req.cookies?.eventpass_token ||
    (req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.slice(7)
      : null);

  if (!token) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required. Please log in.',
      },
    });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: 'Your session has expired or is invalid. Please log in again.',
      },
    });
  }

  // Ensure the authenticated user exists in the active database instance (prevents foreign-key constraint failures on serverless or across worker restarts)
  try {
    let dbUser = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!dbUser && decoded.email) {
      dbUser = await prisma.user.findUnique({ where: { email: decoded.email.toLowerCase().trim() } });
      if (dbUser) {
        decoded.id = dbUser.id;
        decoded.role = dbUser.role as any;
      } else {
        // Auto-heal/synchronize user record into local database
        try {
          dbUser = await prisma.user.create({
            data: {
              id: decoded.id,
              name: decoded.name || 'User',
              email: decoded.email.toLowerCase().trim(),
              passwordHash: '$2a$10$wE9q5qWJ6L9C7D.sYfD1O.T1Y6l5p0v1h1b.a3q.9a3d4',
              role: decoded.role || 'ORGANIZER',
            },
          });
        } catch {
          // If concurrent insertion occurred, re-query
          dbUser = await prisma.user.findUnique({ where: { email: decoded.email.toLowerCase().trim() } });
          if (dbUser) decoded.id = dbUser.id;
        }
      }
    }
  } catch (syncErr) {
    console.warn('[requireAuth] User synchronization warning:', syncErr);
  }

  req.user = decoded;
  next();
}

/**
 * Middleware requiring ORGANIZER role
 */
export function requireOrganizer(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  if (!req.user || req.user.role !== 'ORGANIZER') {
    return res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'Organizer privileges required for this action.',
      },
    });
  }
  next();
}

/**
 * Middleware ensuring user has access to a specific event (Owner Organizer OR Assigned Staff)
 */
export async function requireEventAccess(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const eventId = req.params.id || req.params.eventId || req.body?.eventId;

  if (!eventId) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'MISSING_EVENT_ID',
        message: 'Event ID is required.',
      },
    });
  }

  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required.',
      },
    });
  }

  const { connected } = await checkDatabaseConnection();
  if (!connected) {
    return res.status(503).json({
      success: false,
      error: {
        code: 'DATABASE_DISCONNECTED',
        message: 'MySQL database is not connected. Please verify your connection settings.',
      },
    });
  }

  try {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        organizer: {
          select: { id: true, email: true },
        },
        staff: {
          include: {
            user: { select: { id: true, email: true } },
          },
        },
      },
    });

    if (!event) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'EVENT_NOT_FOUND',
          message: 'The requested event does not exist.',
        },
      });
    }

    const isOwner =
      event.organizerId === req.user.id ||
      (event.organizer && req.user.email && event.organizer.email.toLowerCase() === req.user.email.toLowerCase());

    const isAssignedStaff =
      event.staff.some(
        (s) =>
          s.userId === req.user!.id ||
          (s.user && req.user!.email && s.user.email.toLowerCase() === req.user!.email.toLowerCase())
      );

    if (!isOwner && !isAssignedStaff) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You are not authorized to access this event.',
        },
      });
    }

    next();
  } catch (err: any) {
    console.error('requireEventAccess error:', err);
    return res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to verify event access permissions.',
      },
    });
  }
}
