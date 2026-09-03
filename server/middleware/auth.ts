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
        staff: {
          where: { userId: req.user.id },
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

    const isOwner = event.organizerId === req.user.id;
    const isAssignedStaff = event.staff.length > 0;

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
