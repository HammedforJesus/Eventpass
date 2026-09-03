import { Router, Response } from 'express';
import { prisma, checkDatabaseConnection } from '../db.js';
import {
  requireAuth,
  requireEventAccess,
  AuthenticatedRequest,
} from '../middleware/auth.js';
import { codeVerificationLimiter } from '../middleware/rateLimit.js';
import { hashToken, verifyCode } from '../utils/crypto.js';
import { logAudit } from '../utils/audit.js';
import { broadcastCheckIn } from '../socket/index.js';

const router = Router();

// Middleware checking DB connection
async function ensureDb(req: any, res: Response, next: any) {
  const { connected, error } = await checkDatabaseConnection();
  if (!connected) {
    return res.status(503).json({
      success: false,
      error: {
        code: 'DATABASE_DISCONNECTED',
        message: 'MySQL database is not connected. Please verify your connection settings.',
        details: error,
      },
    });
  }
  next();
}

router.use(requireAuth, ensureDb);

/**
 * Helper to compute live event stats for broadcast
 */
async function getLiveEventStats(eventId: string, capacity: number) {
  const [totalInvited, checkedIn] = await Promise.all([
    prisma.invitation.count({ where: { eventId } }),
    prisma.checkIn.count({ where: { eventId } }),
  ]);
  const remaining = Math.max(0, capacity - checkedIn);
  const attendanceRate = totalInvited > 0 ? Math.round((checkedIn / totalInvited) * 100) : 0;
  return { totalInvited, checkedIn, remaining, attendanceRate, capacity };
}

/**
 * POST /api/checkin/qr - Scan QR token check-in
 */
router.post('/qr', requireEventAccess, async (req: AuthenticatedRequest, res: Response) => {
  const { eventId, token } = req.body;

  if (!eventId || !token) {
    return res.status(400).json({
      success: false,
      error: { code: 'MISSING_FIELDS', message: 'Event ID and QR token are required.' },
    });
  }

  try {
    const cleanToken = token.trim();
    // Allow URL paths if camera read the full URL
    const extractedToken = cleanToken.includes('/invite/')
      ? cleanToken.split('/invite/')[1].split(/[?#]/)[0]
      : cleanToken;

    const tokenHashed = hashToken(extractedToken);

    // 1. Find event
    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) {
      return res.status(404).json({
        success: false,
        error: { code: 'EVENT_NOT_FOUND', message: 'Event does not exist.' },
      });
    }

    if (event.status === 'CANCELLED') {
      return res.status(400).json({
        success: false,
        error: { code: 'EVENT_CANCELLED', message: 'This event has been cancelled.' },
      });
    }

    // 2. Find invitation
    const invitation = await prisma.invitation.findFirst({
      where: {
        OR: [{ token: extractedToken }, { tokenHash: tokenHashed }],
      },
      include: {
        guest: true,
        checkIn: {
          include: {
            staffUser: { select: { name: true } },
          },
        },
      },
    });

    if (!invitation) {
      await logAudit({
        actorId: req.user!.id,
        eventId,
        action: 'CHECKIN_FAILED_INVALID_TOKEN',
        metadata: { reason: 'INVITATION_NOT_FOUND' },
        req,
      });
      return res.status(404).json({
        success: false,
        error: { code: 'INVALID_INVITATION', message: 'Invalid QR Code. No matching invitation found.' },
      });
    }

    // 3. Confirm invitation belongs to event
    if (invitation.eventId !== eventId) {
      await logAudit({
        actorId: req.user!.id,
        eventId,
        action: 'CHECKIN_FAILED_WRONG_EVENT',
        metadata: { invitationEventId: invitation.eventId, scannedForEventId: eventId },
        req,
      });
      return res.status(400).json({
        success: false,
        error: { code: 'WRONG_EVENT', message: 'This invitation belongs to a different event.' },
      });
    }

    // 4. Check revocation
    if (invitation.status === 'REVOKED' || invitation.revokedAt) {
      await logAudit({
        actorId: req.user!.id,
        eventId,
        action: 'CHECKIN_FAILED_REVOKED',
        targetType: 'Invitation',
        targetId: invitation.id,
        req,
      });
      return res.status(400).json({
        success: false,
        error: { code: 'INVITATION_REVOKED', message: 'This invitation has been revoked by the organizer.' },
      });
    }

    // 5. Check expiration
    const now = new Date();
    if (now > invitation.expiresAt) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVITATION_EXPIRED', message: 'This invitation has expired.' },
      });
    }

    // 6. Check duplicate check-in
    if (invitation.checkIn) {
      const formattedTime = new Date(invitation.checkIn.checkedInAt).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      return res.status(409).json({
        success: false,
        error: {
          code: 'ALREADY_CHECKED_IN',
          message: `Already Checked In at ${formattedTime}${
            invitation.checkIn.staffUser?.name ? ` by ${invitation.checkIn.staffUser.name}` : ''
          }.`,
          guest: {
            name: invitation.guest.name,
            category: invitation.guest.category,
            checkedInAt: invitation.checkIn.checkedInAt,
          },
        },
      });
    }

    // 7. Atomic transaction with capacity check & duplicate check-in protection
    const checkInResult = await prisma.$transaction(async (tx) => {
      // Re-verify capacity inside transaction
      const currentAttendance = await tx.checkIn.count({ where: { eventId } });
      if (currentAttendance >= event.capacity) {
        throw new Error('EVENT_CAPACITY_REACHED');
      }

      // Check duplicate again in transaction
      const existingCheckIn = await tx.checkIn.findFirst({
        where: {
          OR: [{ invitationId: invitation.id }, { guestId: invitation.guestId }],
        },
      });
      if (existingCheckIn) {
        throw new Error('ALREADY_CHECKED_IN');
      }

      const checkIn = await tx.checkIn.create({
        data: {
          eventId,
          guestId: invitation.guestId,
          invitationId: invitation.id,
          checkedInBy: req.user!.id,
        },
      });

      await tx.invitation.update({
        where: { id: invitation.id },
        data: { status: 'CHECKED_IN' },
      });

      return checkIn;
    });

    // 8. Record audit log
    await logAudit({
      actorId: req.user!.id,
      eventId,
      action: 'CHECKIN_SUCCESS_QR',
      targetType: 'Guest',
      targetId: invitation.guestId,
      metadata: {
        guestName: invitation.guest.name,
        category: invitation.guest.category,
        checkInId: checkInResult.id,
      },
      req,
    });

    // 9. Compute stats and broadcast via Socket.IO
    const stats = await getLiveEventStats(eventId, event.capacity);
    broadcastCheckIn(eventId, {
      guestName: invitation.guest.name,
      category: invitation.guest.category,
      checkedInAt: checkInResult.checkedInAt.toISOString(),
      checkedInBy: req.user!.name,
      stats,
    });

    // 10. Return success response
    return res.status(200).json({
      success: true,
      data: {
        message: 'CHECK-IN SUCCESSFUL',
        guest: {
          id: invitation.guest.id,
          name: invitation.guest.name,
          category: invitation.guest.category,
          plusOne: invitation.guest.plusOne,
        },
        checkIn: {
          id: checkInResult.id,
          checkedInAt: checkInResult.checkedInAt,
          checkedInBy: req.user!.name,
        },
        stats,
      },
    });
  } catch (err: any) {
    if (err.message === 'ALREADY_CHECKED_IN') {
      return res.status(409).json({
        success: false,
        error: { code: 'ALREADY_CHECKED_IN', message: 'Guest has already been checked in.' },
      });
    }
    if (err.message === 'EVENT_CAPACITY_REACHED') {
      return res.status(400).json({
        success: false,
        error: { code: 'CAPACITY_REACHED', message: 'Event has reached maximum capacity.' },
      });
    }
    console.error('QR Check-in error:', err);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Check-in processing failed.' },
    });
  }
});

/**
 * POST /api/checkin/code - Manual 6-digit verification code check-in
 */
router.post(
  '/code',
  codeVerificationLimiter,
  requireEventAccess,
  async (req: AuthenticatedRequest, res: Response) => {
    const { eventId, code } = req.body;

    if (!eventId || !code) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_FIELDS', message: 'Event ID and 6-digit code are required.' },
      });
    }

    const cleanCode = String(code).trim();
    if (!/^\d{6}$/.test(cleanCode)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_CODE_FORMAT', message: 'Verification code must be exactly 6 digits.' },
      });
    }

    try {
      // 1. Confirm event exists
      const event = await prisma.event.findUnique({ where: { id: eventId } });
      if (!event) {
        return res.status(404).json({
          success: false,
          error: { code: 'EVENT_NOT_FOUND', message: 'Event not found.' },
        });
      }

      if (event.status === 'CANCELLED') {
        return res.status(400).json({
          success: false,
          error: { code: 'EVENT_CANCELLED', message: 'This event has been cancelled.' },
        });
      }

      // 2. Find invitations for this event to verify against hash
      const invitations = await prisma.invitation.findMany({
        where: { eventId },
        include: {
          guest: true,
          checkIn: {
            include: {
              staffUser: { select: { name: true } },
            },
          },
        },
      });

      let matchedInvitation: any = null;
      for (const inv of invitations) {
        const isMatch = await verifyCode(cleanCode, inv.verificationCodeHash);
        if (isMatch) {
          matchedInvitation = inv;
          break;
        }
      }

      if (!matchedInvitation) {
        await logAudit({
          actorId: req.user!.id,
          eventId,
          action: 'CHECKIN_FAILED_WRONG_CODE',
          metadata: { attemptCode: '******' },
          req,
        });
        return res.status(404).json({
          success: false,
          error: { code: 'INVALID_CODE', message: 'Invalid 6-digit code. Verification failed.' },
        });
      }

      // 3. Check revocation
      if (matchedInvitation.status === 'REVOKED' || matchedInvitation.revokedAt) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVITATION_REVOKED', message: 'This invitation has been revoked by the organizer.' },
        });
      }

      // 4. Check expiration
      const now = new Date();
      if (now > matchedInvitation.expiresAt) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVITATION_EXPIRED', message: 'This invitation has expired.' },
        });
      }

      // 5. Check duplicate check-in
      if (matchedInvitation.checkIn) {
        const formattedTime = new Date(matchedInvitation.checkIn.checkedInAt).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        });
        return res.status(409).json({
          success: false,
          error: {
            code: 'ALREADY_CHECKED_IN',
            message: `Already Checked In at ${formattedTime}${
              matchedInvitation.checkIn.staffUser?.name
                ? ` by ${matchedInvitation.checkIn.staffUser.name}`
                : ''
            }.`,
            guest: {
              name: matchedInvitation.guest.name,
              category: matchedInvitation.guest.category,
              checkedInAt: matchedInvitation.checkIn.checkedInAt,
            },
          },
        });
      }

      // 6. Perform atomic check-in
      const checkInResult = await prisma.$transaction(async (tx) => {
        const currentAttendance = await tx.checkIn.count({ where: { eventId } });
        if (currentAttendance >= event.capacity) {
          throw new Error('EVENT_CAPACITY_REACHED');
        }

        const existingCheckIn = await tx.checkIn.findFirst({
          where: {
            OR: [{ invitationId: matchedInvitation.id }, { guestId: matchedInvitation.guestId }],
          },
        });
        if (existingCheckIn) {
          throw new Error('ALREADY_CHECKED_IN');
        }

        const checkIn = await tx.checkIn.create({
          data: {
            eventId,
            guestId: matchedInvitation.guestId,
            invitationId: matchedInvitation.id,
            checkedInBy: req.user!.id,
          },
        });

        await tx.invitation.update({
          where: { id: matchedInvitation.id },
          data: { status: 'CHECKED_IN' },
        });

        return checkIn;
      });

      // 7. Audit log
      await logAudit({
        actorId: req.user!.id,
        eventId,
        action: 'CHECKIN_SUCCESS_CODE',
        targetType: 'Guest',
        targetId: matchedInvitation.guestId,
        metadata: {
          guestName: matchedInvitation.guest.name,
          category: matchedInvitation.guest.category,
          checkInId: checkInResult.id,
        },
        req,
      });

      // 8. Broadcast
      const stats = await getLiveEventStats(eventId, event.capacity);
      broadcastCheckIn(eventId, {
        guestName: matchedInvitation.guest.name,
        category: matchedInvitation.guest.category,
        checkedInAt: checkInResult.checkedInAt.toISOString(),
        checkedInBy: req.user!.name,
        stats,
      });

      return res.status(200).json({
        success: true,
        data: {
          message: 'CHECK-IN SUCCESSFUL',
          guest: {
            id: matchedInvitation.guest.id,
            name: matchedInvitation.guest.name,
            category: matchedInvitation.guest.category,
            plusOne: matchedInvitation.guest.plusOne,
          },
          checkIn: {
            id: checkInResult.id,
            checkedInAt: checkInResult.checkedInAt,
            checkedInBy: req.user!.name,
          },
          stats,
        },
      });
    } catch (err: any) {
      if (err.message === 'ALREADY_CHECKED_IN') {
        return res.status(409).json({
          success: false,
          error: { code: 'ALREADY_CHECKED_IN', message: 'Guest has already been checked in.' },
        });
      }
      if (err.message === 'EVENT_CAPACITY_REACHED') {
        return res.status(400).json({
          success: false,
          error: { code: 'CAPACITY_REACHED', message: 'Event has reached maximum capacity.' },
        });
      }
      console.error('Code Check-in error:', err);
      return res.status(500).json({
        success: false,
        error: { code: 'SERVER_ERROR', message: 'Check-in processing failed.' },
      });
    }
  }
);

export default router;
