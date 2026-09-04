import { Router, Request, Response } from 'express';
import { prisma, checkDatabaseConnection } from '../db.js';
import { hashToken } from '../utils/crypto.js';
import { logAudit } from '../utils/audit.js';

const router = Router();

/**
 * GET /api/invitations/:token - Public invitation retrieval
 */
router.get('/:token', async (req: Request, res: Response) => {
  const { token } = req.params;

  if (!token || token.trim().length < 8) {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_TOKEN', message: 'Invalid invitation link.' },
    });
  }

  const { connected } = await checkDatabaseConnection();
  if (!connected) {
    return res.status(503).json({
      success: false,
      error: {
        code: 'DATABASE_DISCONNECTED',
        message: 'Database service is temporarily unavailable. Please retry in a few moments.',
      },
    });
  }

  try {
    const cleanToken = token.trim();
    const tokenHashed = hashToken(cleanToken);

    // Look up by token or tokenHash
    const invitation = await prisma.invitation.findFirst({
      where: {
        OR: [{ token: cleanToken }, { tokenHash: tokenHashed }],
      },
      include: {
        guest: {
          select: {
            id: true,
            name: true,
            email: true,
            category: true,
            plusOne: true,
          },
        },
        event: {
          select: {
            id: true,
            name: true,
            description: true,
            venue: true,
            address: true,
            startDateTime: true,
            endDateTime: true,
            status: true,
            bannerUrl: true,
            rsvpDeadline: true,
          },
        },
        checkIn: {
          select: {
            checkedInAt: true,
          },
        },
      },
    });

    if (!invitation) {
      return res.status(404).json({
        success: false,
        error: { code: 'INVITATION_NOT_FOUND', message: 'This invitation was not found or has been removed.' },
      });
    }

    const now = new Date();

    // Check revocation
    if (invitation.status === 'REVOKED' || invitation.revokedAt) {
      return res.status(410).json({
        success: false,
        error: { code: 'INVITATION_REVOKED', message: 'This invitation has been revoked by the organizer.' },
        data: {
          status: 'REVOKED',
          event: { name: invitation.event.name },
        },
      });
    }

    // Check expiration
    if (now > invitation.expiresAt) {
      if (invitation.status !== 'EXPIRED') {
        await prisma.invitation.update({
          where: { id: invitation.id },
          data: { status: 'EXPIRED' },
        });
      }
      return res.status(410).json({
        success: false,
        error: { code: 'INVITATION_EXPIRED', message: 'This invitation has expired.' },
        data: {
          status: 'EXPIRED',
          event: { name: invitation.event.name },
        },
      });
    }

    // Mark as VIEWED if still PENDING
    if (invitation.status === 'PENDING') {
      await prisma.invitation.update({
        where: { id: invitation.id },
        data: {
          status: 'VIEWED',
          viewedAt: now,
        },
      });
      invitation.status = 'VIEWED';
    }

    // Return safe guest payload
    return res.json({
      success: true,
      data: {
        id: invitation.id,
        token: invitation.token,
        status: invitation.status,
        rsvpStatus: invitation.rsvpStatus,
        rsvpAt: invitation.rsvpAt,
        expiresAt: invitation.expiresAt,
        isCheckedIn: Boolean(invitation.checkIn),
        checkedInAt: invitation.checkIn?.checkedInAt || null,
        guest: invitation.guest,
        event: invitation.event,
      },
    });
  } catch (err: any) {
    console.error('Get invitation error:', err);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to retrieve invitation.' },
    });
  }
});

/**
 * POST /api/invitations/:token/rsvp - Guest RSVP action
 */
router.post('/:token/rsvp', async (req: Request, res: Response) => {
  const { token } = req.params;
  const { status } = req.body; // 'ACCEPTED' | 'DECLINED'

  if (!['ACCEPTED', 'DECLINED'].includes(status)) {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_RSVP', message: 'RSVP status must be ACCEPTED or DECLINED.' },
    });
  }

  const { connected } = await checkDatabaseConnection();
  if (!connected) {
    return res.status(503).json({
      success: false,
      error: { code: 'DATABASE_DISCONNECTED', message: 'MySQL database is unavailable.' },
    });
  }

  try {
    const cleanToken = token.trim();
    const tokenHashed = hashToken(cleanToken);

    const invitation = await prisma.invitation.findFirst({
      where: {
        OR: [{ token: cleanToken }, { tokenHash: tokenHashed }],
      },
      include: {
        event: true,
        guest: true,
      },
    });

    if (!invitation) {
      return res.status(404).json({
        success: false,
        error: { code: 'INVITATION_NOT_FOUND', message: 'Invitation not found.' },
      });
    }

    if (invitation.status === 'REVOKED' || invitation.revokedAt) {
      return res.status(410).json({
        success: false,
        error: { code: 'INVITATION_REVOKED', message: 'Cannot update RSVP on a revoked invitation.' },
      });
    }

    const now = new Date();
    if (now > invitation.expiresAt) {
      return res.status(410).json({
        success: false,
        error: { code: 'INVITATION_EXPIRED', message: 'Cannot update RSVP on an expired invitation.' },
      });
    }

    if (invitation.event.rsvpDeadline && now > invitation.event.rsvpDeadline) {
      return res.status(400).json({
        success: false,
        error: { code: 'RSVP_DEADLINE_PASSED', message: 'The RSVP deadline for this event has passed.' },
      });
    }

    const newInvitationStatus = status === 'ACCEPTED' ? 'ACCEPTED' : 'DECLINED';

    const updated = await prisma.invitation.update({
      where: { id: invitation.id },
      data: {
        rsvpStatus: status,
        status: newInvitationStatus,
        rsvpAt: now,
      },
    });

    await logAudit({
      eventId: invitation.eventId,
      action: 'GUEST_RSVP_UPDATED',
      targetType: 'Invitation',
      targetId: invitation.id,
      metadata: { guestName: invitation.guest.name, rsvpStatus: status },
      req,
    });

    return res.json({
      success: true,
      data: {
        rsvpStatus: updated.rsvpStatus,
        rsvpAt: updated.rsvpAt,
        status: updated.status,
      },
    });
  } catch (err: any) {
    console.error('RSVP error:', err);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to record RSVP response.' },
    });
  }
});

export default router;
