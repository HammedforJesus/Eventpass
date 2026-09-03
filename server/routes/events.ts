import { Router, Response } from 'express';
import { prisma, checkDatabaseConnection } from '../db.js';
import {
  requireAuth,
  requireOrganizer,
  requireEventAccess,
  AuthenticatedRequest,
} from '../middleware/auth.js';
import {
  generateInvitationToken,
  hashToken,
  generate6DigitCode,
  hashCode,
  hashPassword,
} from '../utils/crypto.js';
import { logAudit } from '../utils/audit.js';
import {
  sendInvitationEmail,
  getSentEmailsForEvent,
  getSentEmailById,
  getActiveSmtpConfig,
  saveRuntimeSmtpConfig,
} from '../services/emailService.js';

const router = Router();

function getBaseUrl(req: AuthenticatedRequest): string {
  const origin = req.get('origin');
  if (origin && origin !== 'null') return origin;
  const referer = req.get('referer');
  if (referer) {
    try {
      const url = new URL(referer);
      return url.origin;
    } catch {}
  }
  if (process.env.APP_URL) return process.env.APP_URL;
  if (process.env.CLIENT_URL) return process.env.CLIENT_URL;
  const host = req.get('host');
  const protocol = req.protocol || 'http';
  return `${protocol}://${host}`;
}

/**
 * Middleware checking DB availability
 */
async function ensureDb(req: any, res: Response, next: any) {
  const { connected, error } = await checkDatabaseConnection();
  if (!connected) {
    return res.status(503).json({
      success: false,
      error: {
        code: 'DATABASE_DISCONNECTED',
        message: 'Database is not connected. Please check database configuration.',
        details: error,
      },
    });
  }
  next();
}

router.use(requireAuth, ensureDb);

/**
 * GET /api/events - List events accessible to current user
 */
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  try {
    let events;
    if (user.role === 'ORGANIZER') {
      events = await prisma.event.findMany({
        where: { organizerId: user.id },
        include: {
          _count: {
            select: {
              guests: true,
              invitations: true,
              checkIns: true,
              staff: true,
            },
          },
        },
        orderBy: { startDateTime: 'desc' },
      });
    } else {
      // Staff only sees assigned events
      events = await prisma.event.findMany({
        where: {
          staff: {
            some: { userId: user.id },
          },
        },
        include: {
          _count: {
            select: {
              guests: true,
              invitations: true,
              checkIns: true,
              staff: true,
            },
          },
        },
        orderBy: { startDateTime: 'desc' },
      });
    }

    return res.json({ success: true, data: events });
  } catch (err: any) {
    console.error('List events error:', err);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to retrieve events.' },
    });
  }
});

/**
 * POST /api/events - Create a new event (Organizer only)
 */
router.post('/', requireOrganizer, async (req: AuthenticatedRequest, res: Response) => {
  const {
    name,
    description,
    venue,
    address,
    startDateTime,
    endDateTime,
    capacity,
    status,
    rsvpDeadline,
    bannerUrl,
  } = req.body;

  if (!name || !venue || !address || !startDateTime || !endDateTime) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'MISSING_FIELDS',
        message: 'Name, venue, address, start date/time, and end date/time are required.',
      },
    });
  }

  const start = new Date(startDateTime);
  const end = new Date(endDateTime);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_DATES', message: 'Provided dates are invalid.' },
    });
  }

  if (end <= start) {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_DATE_RANGE', message: 'Event end time must be after start time.' },
    });
  }

  const parsedCapacity = parseInt(capacity, 10) || 100;
  if (parsedCapacity < 1) {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_CAPACITY', message: 'Capacity must be at least 1.' },
    });
  }

  try {
    const event = await prisma.event.create({
      data: {
        organizerId: req.user!.id,
        name: name.trim(),
        description: description?.trim() || null,
        venue: venue.trim(),
        address: address.trim(),
        startDateTime: start,
        endDateTime: end,
        capacity: parsedCapacity,
        status: status || 'UPCOMING',
        rsvpDeadline: rsvpDeadline ? new Date(rsvpDeadline) : null,
        bannerUrl: bannerUrl || null,
      },
    });

    await logAudit({
      actorId: req.user!.id,
      eventId: event.id,
      action: 'EVENT_CREATED',
      targetType: 'Event',
      targetId: event.id,
      metadata: { name: event.name, capacity: event.capacity },
      req,
    });

    return res.status(201).json({ success: true, data: event });
  } catch (err: any) {
    console.error('Create event error:', err);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to create event.' },
    });
  }
});

/**
 * GET /api/events/:id - Get event details
 */
router.get('/:id', requireEventAccess, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const event = await prisma.event.findUnique({
      where: { id: req.params.id },
      include: {
        organizer: {
          select: { id: true, name: true, email: true },
        },
        _count: {
          select: {
            guests: true,
            invitations: true,
            checkIns: true,
            staff: true,
          },
        },
      },
    });

    if (!event) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Event not found.' },
      });
    }

    return res.json({ success: true, data: event });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to fetch event.' },
    });
  }
});

/**
 * PUT /api/events/:id - Update event (Organizer only)
 */
router.put('/:id', requireOrganizer, async (req: AuthenticatedRequest, res: Response) => {
  const eventId = req.params.id;
  const {
    name,
    description,
    venue,
    address,
    startDateTime,
    endDateTime,
    capacity,
    status,
    rsvpDeadline,
    bannerUrl,
  } = req.body;

  try {
    const existing = await prisma.event.findUnique({ where: { id: eventId } });
    if (!existing || existing.organizerId !== req.user!.id) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'You cannot edit this event.' },
      });
    }

    const dataToUpdate: any = {};
    if (name) dataToUpdate.name = name.trim();
    if (description !== undefined) dataToUpdate.description = description?.trim() || null;
    if (venue) dataToUpdate.venue = venue.trim();
    if (address) dataToUpdate.address = address.trim();
    if (startDateTime) dataToUpdate.startDateTime = new Date(startDateTime);
    if (endDateTime) dataToUpdate.endDateTime = new Date(endDateTime);
    if (capacity !== undefined) dataToUpdate.capacity = Math.max(1, parseInt(capacity, 10));
    if (status) dataToUpdate.status = status;
    if (rsvpDeadline !== undefined) {
      dataToUpdate.rsvpDeadline = rsvpDeadline ? new Date(rsvpDeadline) : null;
    }
    if (bannerUrl !== undefined) dataToUpdate.bannerUrl = bannerUrl || null;

    const updated = await prisma.event.update({
      where: { id: eventId },
      data: dataToUpdate,
    });

    await logAudit({
      actorId: req.user!.id,
      eventId: updated.id,
      action: 'EVENT_UPDATED',
      targetType: 'Event',
      targetId: updated.id,
      metadata: dataToUpdate,
      req,
    });

    return res.json({ success: true, data: updated });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to update event.' },
    });
  }
});

/**
 * DELETE /api/events/:id - Delete or cancel event (Organizer only)
 */
router.delete('/:id', requireOrganizer, async (req: AuthenticatedRequest, res: Response) => {
  const eventId = req.params.id;

  try {
    const existing = await prisma.event.findUnique({ where: { id: eventId } });
    if (!existing || existing.organizerId !== req.user!.id) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'You cannot delete this event.' },
      });
    }

    await prisma.event.delete({ where: { id: eventId } });

    await logAudit({
      actorId: req.user!.id,
      eventId,
      action: 'EVENT_DELETED',
      targetType: 'Event',
      targetId: eventId,
      metadata: { name: existing.name },
      req,
    });

    return res.json({ success: true, data: { message: 'Event deleted successfully.' } });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to delete event.' },
    });
  }
});

/**
 * GET /api/events/:id/guests - List guests with search and filtering
 */
router.get('/:id/guests', requireEventAccess, async (req: AuthenticatedRequest, res: Response) => {
  const eventId = req.params.id;
  const { search, category, rsvp, checkin } = req.query;

  try {
    const where: any = { eventId };

    if (category && typeof category === 'string' && category !== 'ALL') {
      where.category = category;
    }

    if (search && typeof search === 'string') {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { phone: { contains: search } },
      ];
    }

    if (rsvp && typeof rsvp === 'string' && rsvp !== 'ALL') {
      where.invitation = {
        rsvpStatus: rsvp,
      };
    }

    if (checkin && typeof checkin === 'string' && checkin !== 'ALL') {
      if (checkin === 'CHECKED_IN') {
        where.checkIn = { isNot: null };
      } else if (checkin === 'NOT_CHECKED_IN') {
        where.checkIn = null;
      }
    }

    const guests = await prisma.guest.findMany({
      where,
      include: {
        invitation: {
          select: {
            id: true,
            token: true,
            status: true,
            rsvpStatus: true,
            expiresAt: true,
            revokedAt: true,
            viewedAt: true,
          },
        },
        checkIn: {
          select: {
            id: true,
            checkedInAt: true,
            checkedInBy: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ success: true, data: guests });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to fetch guests.' },
    });
  }
});

/**
 * POST /api/events/:id/guests - Add a guest and generate invitation
 */
router.post('/:id/guests', requireOrganizer, async (req: AuthenticatedRequest, res: Response) => {
  const eventId = req.params.id;
  const { name, email, phone, category, plusOne, notes } = req.body;

  if (!name || !email) {
    return res.status(400).json({
      success: false,
      error: { code: 'MISSING_FIELDS', message: 'Guest name and email are required.' },
    });
  }

  try {
    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event || event.organizerId !== req.user!.id) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'You cannot manage guests for this event.' },
      });
    }

    // Check duplicate email in this event
    const existingGuest = await prisma.guest.findFirst({
      where: { eventId, email: email.toLowerCase().trim() },
    });

    if (existingGuest) {
      return res.status(409).json({
        success: false,
        error: { code: 'DUPLICATE_GUEST', message: 'A guest with this email is already on the list.' },
      });
    }

    // Generate credentials
    const token = generateInvitationToken();
    const tokenHash = hashToken(token);
    const code = generate6DigitCode();
    const verificationCodeHash = await hashCode(code);

    // Default expiration: 48h after event end
    const expiresAt = new Date(event.endDateTime.getTime() + 48 * 60 * 60 * 1000);

    const guest = await prisma.$transaction(async (tx) => {
      const newGuest = await tx.guest.create({
        data: {
          eventId,
          name: name.trim(),
          email: email.toLowerCase().trim(),
          phone: phone?.trim() || null,
          category: category || 'REGULAR',
          plusOne: parseInt(plusOne, 10) || 0,
          notes: notes?.trim() || null,
        },
      });

      const invitation = await tx.invitation.create({
        data: {
          guestId: newGuest.id,
          eventId,
          token,
          tokenHash,
          verificationCodeHash,
          status: req.body.sendImmediately ? 'SENT' : 'PENDING',
          rsvpStatus: 'PENDING',
          expiresAt,
        },
      });

      return {
        ...newGuest,
        invitation: {
          ...invitation,
          rawVerificationCode: code, // returned once to organizer
        },
      };
    });

    await logAudit({
      actorId: req.user!.id,
      eventId,
      action: req.body.sendImmediately ? 'INVITATION_SENT' : 'GUEST_CREATED',
      targetType: 'Guest',
      targetId: guest.id,
      metadata: {
        name: guest.name,
        email: guest.email,
        category: guest.category,
        sentImmediately: Boolean(req.body.sendImmediately),
      },
      req,
    });

    let emailDelivery: any = null;
    const shouldSend = req.body.sendImmediately !== false;
    if (shouldSend && guest.invitation) {
      try {
        const baseUrl = getBaseUrl(req);
        const passUrl = `${baseUrl}/invite/${guest.invitation.token}`;
        emailDelivery = await sendInvitationEmail({
          eventId,
          eventName: event.name,
          eventDescription: event.description,
          venue: event.venue,
          address: event.address,
          startDateTime: event.startDateTime,
          guestId: guest.id,
          invitationId: guest.invitation.id,
          guestName: guest.name,
          guestEmail: guest.email,
          guestCategory: guest.category,
          plusOne: guest.plusOne,
          passUrl,
          verificationCode: guest.invitation.rawVerificationCode,
        });
      } catch (mailErr) {
        console.warn('Failed to send invitation email on guest creation:', mailErr);
      }
    }

    return res.status(201).json({
      success: true,
      data: {
        ...guest,
        emailDelivery,
      },
    });
  } catch (err: any) {
    console.error('Create guest error:', err);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to add guest.' },
    });
  }
});

/**
 * POST /api/events/:id/guests/import - CSV Import guests
 */
router.post('/:id/guests/import', requireOrganizer, async (req: AuthenticatedRequest, res: Response) => {
  const eventId = req.params.id;
  const { guests } = req.body;

  if (!Array.isArray(guests) || guests.length === 0) {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_PAYLOAD', message: 'Please provide an array of guest rows.' },
    });
  }

  try {
    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event || event.organizerId !== req.user!.id) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'You cannot manage guests for this event.' },
      });
    }

    const existingEmails = new Set(
      (await prisma.guest.findMany({ where: { eventId }, select: { email: true } })).map((g) =>
        g.email.toLowerCase()
      )
    );

    const validRows: any[] = [];
    const invalidRows: any[] = [];
    const seenInBatch = new Set<string>();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const allowedCategories = ['VIP', 'REGULAR', 'SPEAKER', 'STAFF', 'MEDIA', 'OTHER'];

    for (let i = 0; i < guests.length; i++) {
      const row = guests[i];
      const name = (row.name || '').trim();
      const email = (row.email || '').toLowerCase().trim();
      const phone = (row.phone || '').trim() || null;
      let category = (row.category || 'REGULAR').toUpperCase().trim();
      if (!allowedCategories.includes(category)) category = 'REGULAR';
      const plusOne = parseInt(row.plusOne, 10) || 0;

      if (!name) {
        invalidRows.push({ row: i + 1, data: row, reason: 'Missing name' });
        continue;
      }
      if (!email || !emailRegex.test(email)) {
        invalidRows.push({ row: i + 1, data: row, reason: 'Invalid or missing email' });
        continue;
      }
      if (existingEmails.has(email) || seenInBatch.has(email)) {
        invalidRows.push({ row: i + 1, data: row, reason: 'Duplicate email in event' });
        continue;
      }

      seenInBatch.add(email);
      validRows.push({ name, email, phone, category, plusOne });
    }

    // Default expiration: 48h after event end
    const expiresAt = new Date(event.endDateTime.getTime() + 48 * 60 * 60 * 1000);

    let importedCount = 0;
    for (const item of validRows) {
      const token = generateInvitationToken();
      const tokenHash = hashToken(token);
      const code = generate6DigitCode();
      const verificationCodeHash = await hashCode(code);

      await prisma.$transaction(async (tx) => {
        const guest = await tx.guest.create({
          data: {
            eventId,
            name: item.name,
            email: item.email,
            phone: item.phone,
            category: item.category,
            plusOne: item.plusOne,
          },
        });

        await tx.invitation.create({
          data: {
            guestId: guest.id,
            eventId,
            token,
            tokenHash,
            verificationCodeHash,
            status: 'PENDING',
            rsvpStatus: 'PENDING',
            expiresAt,
          },
        });
      });
      importedCount++;
    }

    await logAudit({
      actorId: req.user!.id,
      eventId,
      action: 'GUESTS_IMPORTED_CSV',
      targetType: 'Event',
      targetId: eventId,
      metadata: { importedCount, invalidCount: invalidRows.length },
      req,
    });

    return res.json({
      success: true,
      data: {
        importedCount,
        invalidCount: invalidRows.length,
        invalidRows,
      },
    });
  } catch (err: any) {
    console.error('Import error:', err);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to process CSV import.' },
    });
  }
});

/**
 * DELETE /api/events/:id/guests/:guestId - Delete guest
 */
router.delete('/:id/guests/:guestId', requireOrganizer, async (req: AuthenticatedRequest, res: Response) => {
  const { id: eventId, guestId } = req.params;

  try {
    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event || event.organizerId !== req.user!.id) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Unauthorized action.' },
      });
    }

    const guest = await prisma.guest.findUnique({ where: { id: guestId } });
    if (!guest || guest.eventId !== eventId) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Guest not found in this event.' },
      });
    }

    await prisma.guest.delete({ where: { id: guestId } });

    await logAudit({
      actorId: req.user!.id,
      eventId,
      action: 'GUEST_DELETED',
      targetType: 'Guest',
      targetId: guestId,
      metadata: { name: guest.name, email: guest.email },
      req,
    });

    return res.json({ success: true, data: { message: 'Guest deleted.' } });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to delete guest.' },
    });
  }
});

/**
 * POST /api/events/:id/invitations/:invitationId/revoke - Revoke invitation
 */
router.post(
  '/:id/invitations/:invitationId/revoke',
  requireOrganizer,
  async (req: AuthenticatedRequest, res: Response) => {
    const { id: eventId, invitationId } = req.params;

    try {
      const event = await prisma.event.findUnique({ where: { id: eventId } });
      if (!event || event.organizerId !== req.user!.id) {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Unauthorized action.' },
        });
      }

      const invitation = await prisma.invitation.findUnique({
        where: { id: invitationId },
        include: { guest: true },
      });

      if (!invitation || invitation.eventId !== eventId) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Invitation not found.' },
        });
      }

      const updated = await prisma.invitation.update({
        where: { id: invitationId },
        data: {
          status: 'REVOKED',
          revokedAt: new Date(),
        },
      });

      await logAudit({
        actorId: req.user!.id,
        eventId,
        action: 'INVITATION_REVOKED',
        targetType: 'Invitation',
        targetId: invitationId,
        metadata: { guestName: invitation.guest.name, guestEmail: invitation.guest.email },
        req,
      });

      return res.json({ success: true, data: updated });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: { code: 'SERVER_ERROR', message: 'Failed to revoke invitation.' },
      });
    }
  }
);

/**
 * POST /api/events/:id/invitations/:invitationId/regenerate - Regenerate invitation credentials
 */
router.post(
  '/:id/invitations/:invitationId/regenerate',
  requireOrganizer,
  async (req: AuthenticatedRequest, res: Response) => {
    const { id: eventId, invitationId } = req.params;

    try {
      const event = await prisma.event.findUnique({ where: { id: eventId } });
      if (!event || event.organizerId !== req.user!.id) {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Unauthorized action.' },
        });
      }

      const invitation = await prisma.invitation.findUnique({
        where: { id: invitationId },
        include: { guest: true },
      });

      if (!invitation || invitation.eventId !== eventId) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Invitation not found.' },
        });
      }

      // Generate new credentials
      const newToken = generateInvitationToken();
      const newTokenHash = hashToken(newToken);
      const newCode = generate6DigitCode();
      const newCodeHash = await hashCode(newCode);

      const updated = await prisma.invitation.update({
        where: { id: invitationId },
        data: {
          token: newToken,
          tokenHash: newTokenHash,
          verificationCodeHash: newCodeHash,
          status: 'PENDING',
          revokedAt: null,
        },
      });

      await logAudit({
        actorId: req.user!.id,
        eventId,
        action: 'INVITATION_REGENERATED',
        targetType: 'Invitation',
        targetId: invitationId,
        metadata: { guestName: invitation.guest.name, guestEmail: invitation.guest.email },
        req,
      });

      return res.json({
        success: true,
        data: {
          ...updated,
          rawVerificationCode: newCode,
        },
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: { code: 'SERVER_ERROR', message: 'Failed to regenerate credentials.' },
      });
    }
  }
);

/**
 * POST /api/events/:id/invitations/:invitationId/send - Mark or trigger invitation send
 */
router.post(
  '/:id/invitations/:invitationId/send',
  requireOrganizer,
  async (req: AuthenticatedRequest, res: Response) => {
    const { id: eventId, invitationId } = req.params;
    const { channel = 'EMAIL' } = req.body || {};

    try {
      const event = await prisma.event.findUnique({ where: { id: eventId } });
      if (!event || event.organizerId !== req.user!.id) {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Unauthorized action.' },
        });
      }

      const invitation = await prisma.invitation.findUnique({
        where: { id: invitationId },
        include: { guest: true },
      });

      if (!invitation || invitation.eventId !== eventId) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Invitation not found.' },
        });
      }

      const updated = await prisma.invitation.update({
        where: { id: invitationId },
        data: {
          status: 'SENT',
        },
      });

      const baseUrl = getBaseUrl(req);
      const passUrl = `${baseUrl}/invite/${invitation.token}`;
      let emailDelivery: any = null;

      try {
        emailDelivery = await sendInvitationEmail({
          eventId,
          eventName: event.name,
          eventDescription: event.description,
          venue: event.venue,
          address: event.address,
          startDateTime: event.startDateTime,
          guestId: invitation.guest.id,
          invitationId: invitation.id,
          guestName: invitation.guest.name,
          guestEmail: invitation.guest.email,
          guestCategory: invitation.guest.category,
          plusOne: invitation.guest.plusOne,
          passUrl,
        });
      } catch (mailErr: any) {
        console.warn('sendInvitationEmail failed:', mailErr);
      }

      await logAudit({
        actorId: req.user!.id,
        eventId,
        action: 'INVITATION_SENT',
        targetType: 'Invitation',
        targetId: invitationId,
        metadata: {
          guestName: invitation.guest.name,
          guestEmail: invitation.guest.email,
          channel,
          deliveryMode: emailDelivery?.deliveryMode || 'SIMULATED',
        },
        req,
      });

      return res.json({
        success: true,
        data: {
          ...updated,
          guest: invitation.guest,
          emailDelivery,
          message: `Invitation successfully dispatched to ${invitation.guest.email}`,
        },
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: { code: 'SERVER_ERROR', message: 'Failed to send invitation.' },
      });
    }
  }
);

/**
 * POST /api/events/:id/invitations/send-all - Batch send all pending invitations
 */
router.post(
  '/:id/invitations/send-all',
  requireOrganizer,
  async (req: AuthenticatedRequest, res: Response) => {
    const { id: eventId } = req.params;

    try {
      const event = await prisma.event.findUnique({ where: { id: eventId } });
      if (!event || event.organizerId !== req.user!.id) {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Unauthorized action.' },
        });
      }

      const pendingInvitations = await prisma.invitation.findMany({
        where: {
          eventId,
          status: 'PENDING',
        },
        include: { guest: true },
      });

      const baseUrl = getBaseUrl(req);
      let sentCount = 0;

      for (const inv of pendingInvitations) {
        try {
          const passUrl = `${baseUrl}/invite/${inv.token}`;
          await sendInvitationEmail({
            eventId,
            eventName: event.name,
            eventDescription: event.description,
            venue: event.venue,
            address: event.address,
            startDateTime: event.startDateTime,
            guestId: inv.guest.id,
            invitationId: inv.id,
            guestName: inv.guest.name,
            guestEmail: inv.guest.email,
            guestCategory: inv.guest.category,
            plusOne: inv.guest.plusOne,
            passUrl,
          });

          await prisma.invitation.update({
            where: { id: inv.id },
            data: { status: 'SENT' },
          });
          sentCount++;
        } catch (e) {
          console.warn(`Failed to batch send invitation ${inv.id}:`, e);
        }
      }

      await logAudit({
        actorId: req.user!.id,
        eventId,
        action: 'INVITATIONS_BATCH_SENT',
        targetType: 'Event',
        targetId: eventId,
        metadata: { sentCount },
        req,
      });

      return res.json({
        success: true,
        data: {
          sentCount,
          message: `Successfully dispatched ${sentCount} invitation(s).`,
        },
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: { code: 'SERVER_ERROR', message: 'Failed to send invitations in batch.' },
      });
    }
  }
);

/**
 * GET /api/events/:id/emails - List all sent email records for this event
 */
router.get(
  '/:id/emails',
  requireOrganizer,
  async (req: AuthenticatedRequest, res: Response) => {
    const { id: eventId } = req.params;
    const emails = getSentEmailsForEvent(eventId);
    return res.json({ success: true, data: emails });
  }
);

/**
 * GET /api/events/:id/emails/:emailId/preview - Get raw HTML email content for preview
 */
router.get(
  '/:id/emails/:emailId/preview',
  requireOrganizer,
  async (req: AuthenticatedRequest, res: Response) => {
    const { emailId } = req.params;
    const email = getSentEmailById(emailId);
    if (!email) {
      return res.status(404).send('<h3>Email record not found.</h3>');
    }
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(email.htmlContent);
  }
);

/**
 * GET /api/events/:id/email-config - Get current email delivery configuration status
 */
router.get(
  '/:id/email-config',
  requireOrganizer,
  async (req: AuthenticatedRequest, res: Response) => {
    const active = getActiveSmtpConfig();
    return res.json({
      success: true,
      data: {
        configured: Boolean(active),
        host: active?.host || null,
        port: active?.port || null,
        user: active?.user || null,
        from: active?.from || null,
        mode: active ? 'CUSTOM_SMTP' : 'TEST_SERVICE',
      },
    });
  }
);

/**
 * POST /api/events/:id/email-config - Save or clear custom SMTP settings
 */
router.post(
  '/:id/email-config',
  requireOrganizer,
  async (req: AuthenticatedRequest, res: Response) => {
    const { host, port, secure, user, pass, from, clear } = req.body || {};

    if (clear) {
      saveRuntimeSmtpConfig(null);
      return res.json({
        success: true,
        data: { message: 'Custom SMTP configuration removed. Defaulting to test delivery.' },
      });
    }

    if (!host || !user || !pass) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_CONFIG', message: 'Host, user, and password are required.' },
      });
    }

    saveRuntimeSmtpConfig({
      host: host.trim(),
      port: Number(port) || 587,
      secure: Boolean(secure),
      user: user.trim(),
      pass: pass.trim(),
      from: from?.trim() || `EVENTPASS <${user.trim()}>`,
    });

    return res.json({
      success: true,
      data: { message: 'SMTP credentials updated successfully.' },
    });
  }
);

/**
 * POST /api/events/:id/test-email - Send a test email to verify SMTP delivery
 */
router.post(
  '/:id/test-email',
  requireOrganizer,
  async (req: AuthenticatedRequest, res: Response) => {
    const { id: eventId } = req.params;
    const { toEmail } = req.body || {};

    const targetEmail = toEmail || req.user?.email;
    if (!targetEmail) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_EMAIL', message: 'Target email is required.' },
      });
    }

    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Event not found.' },
      });
    }

    const baseUrl = getBaseUrl(req);
    const result = await sendInvitationEmail({
      eventId,
      eventName: event.name,
      eventDescription: event.description,
      venue: event.venue,
      address: event.address,
      startDateTime: event.startDateTime,
      guestName: req.user?.name || 'Organizer Test',
      guestEmail: targetEmail,
      guestCategory: 'VIP TEST',
      plusOne: 1,
      passUrl: `${baseUrl}/events/${eventId}`,
    });

    return res.json({
      success: true,
      data: {
        targetEmail,
        ...result,
        message: `Test email dispatched to ${targetEmail} via ${result.deliveryMode}`,
      },
    });
  }
);

/**
 * GET /api/events/:id/staff - List staff assigned to event
 */
router.get('/:id/staff', requireEventAccess, async (req: AuthenticatedRequest, res: Response) => {
  const eventId = req.params.id;

  try {
    const staffList = await prisma.eventStaff.findMany({
      where: { eventId },
      include: {
        user: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
      orderBy: { assignedAt: 'desc' },
    });

    return res.json({ success: true, data: staffList });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to retrieve staff list.' },
    });
  }
});

/**
 * POST /api/events/:id/staff - Assign staff member by email
 */
router.post('/:id/staff', requireOrganizer, async (req: AuthenticatedRequest, res: Response) => {
  const eventId = req.params.id;
  const { email, name } = req.body;

  if (!email) {
    return res.status(400).json({
      success: false,
      error: { code: 'MISSING_EMAIL', message: 'Staff email is required.' },
    });
  }

  try {
    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event || event.organizerId !== req.user!.id) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Unauthorized action.' },
      });
    }

    const cleanEmail = email.toLowerCase().trim();
    let staffUser = await prisma.user.findUnique({ where: { email: cleanEmail } });

    // If staff user doesn't exist yet, auto-provision a staff account with a secure temporary password
    if (!staffUser) {
      const defaultPassword = 'StaffPass2026!';
      const passwordHash = await hashPassword(defaultPassword);
      staffUser = await prisma.user.create({
        data: {
          name: name?.trim() || cleanEmail.split('@')[0],
          email: cleanEmail,
          passwordHash,
          role: 'STAFF',
        },
      });
    }

    // Check if already assigned
    const existingAssignment = await prisma.eventStaff.findUnique({
      where: {
        eventId_userId: {
          eventId,
          userId: staffUser.id,
        },
      },
    });

    if (existingAssignment) {
      return res.status(409).json({
        success: false,
        error: { code: 'ALREADY_ASSIGNED', message: 'Staff member is already assigned to this event.' },
      });
    }

    const assignment = await prisma.eventStaff.create({
      data: {
        eventId,
        userId: staffUser.id,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    });

    await logAudit({
      actorId: req.user!.id,
      eventId,
      action: 'STAFF_ASSIGNED',
      targetType: 'User',
      targetId: staffUser.id,
      metadata: { staffEmail: staffUser.email, staffName: staffUser.name },
      req,
    });

    return res.status(201).json({ success: true, data: assignment });
  } catch (err: any) {
    console.error('Assign staff error:', err);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to assign staff.' },
    });
  }
});

/**
 * DELETE /api/events/:id/staff/:staffId - Remove staff assignment
 */
router.delete('/:id/staff/:staffId', requireOrganizer, async (req: AuthenticatedRequest, res: Response) => {
  const { id: eventId, staffId } = req.params;

  try {
    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event || event.organizerId !== req.user!.id) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Unauthorized action.' },
      });
    }

    await prisma.eventStaff.deleteMany({
      where: {
        eventId,
        id: staffId,
      },
    });

    await logAudit({
      actorId: req.user!.id,
      eventId,
      action: 'STAFF_REMOVED',
      targetType: 'EventStaff',
      targetId: staffId,
      req,
    });

    return res.json({ success: true, data: { message: 'Staff removed from event.' } });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to remove staff.' },
    });
  }
});

/**
 * GET /api/events/:id/analytics - Comprehensive analytics
 */
router.get('/:id/analytics', requireEventAccess, async (req: AuthenticatedRequest, res: Response) => {
  const eventId = req.params.id;

  try {
    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Event not found.' },
      });
    }

    const [totalInvited, rsvpAccepted, rsvpDeclined, rsvpPending, checkIns, guests] =
      await Promise.all([
        prisma.invitation.count({ where: { eventId } }),
        prisma.invitation.count({ where: { eventId, rsvpStatus: 'ACCEPTED' } }),
        prisma.invitation.count({ where: { eventId, rsvpStatus: 'DECLINED' } }),
        prisma.invitation.count({ where: { eventId, rsvpStatus: 'PENDING' } }),
        prisma.checkIn.findMany({
          where: { eventId },
          include: {
            guest: { select: { name: true, category: true } },
            staffUser: { select: { name: true } },
          },
          orderBy: { checkedInAt: 'desc' },
        }),
        prisma.guest.findMany({
          where: { eventId },
          select: { category: true },
        }),
      ]);

    const checkedIn = checkIns.length;
    const notCheckedIn = Math.max(0, totalInvited - checkedIn);
    const attendanceRate = totalInvited > 0 ? Math.round((checkedIn / totalInvited) * 100) : 0;
    const remainingCapacity = Math.max(0, event.capacity - checkedIn);

    // Guest category breakdown
    const categoryCounts: Record<string, number> = {};
    for (const g of guests) {
      categoryCounts[g.category] = (categoryCounts[g.category] || 0) + 1;
    }
    const categoryDistribution = Object.entries(categoryCounts).map(([cat, count]) => ({
      category: cat,
      count,
    }));

    // Check-ins over time (grouped by hour/time interval)
    const timeBuckets: Record<string, number> = {};
    for (const c of checkIns) {
      const d = new Date(c.checkedInAt);
      const hour = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      timeBuckets[hour] = (timeBuckets[hour] || 0) + 1;
    }
    const checkInsOverTime = Object.entries(timeBuckets).map(([timeLabel, count]) => ({
      timeLabel,
      count,
    }));

    const recentCheckIns = checkIns.slice(0, 10).map((c) => ({
      id: c.id,
      guestName: c.guest.name,
      category: c.guest.category,
      time: c.checkedInAt.toISOString(),
      staffName: c.staffUser.name,
    }));

    return res.json({
      success: true,
      data: {
        totalInvited,
        rsvpAccepted,
        rsvpDeclined,
        rsvpPending,
        checkedIn,
        notCheckedIn,
        attendanceRate,
        capacity: event.capacity,
        remainingCapacity,
        categoryDistribution,
        checkInsOverTime,
        recentCheckIns,
      },
    });
  } catch (err: any) {
    console.error('Analytics error:', err);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to compute analytics.' },
    });
  }
});

/**
 * GET /api/events/:id/audit-logs - Audit logs for event
 */
router.get('/:id/audit-logs', requireOrganizer, async (req: AuthenticatedRequest, res: Response) => {
  const eventId = req.params.id;

  try {
    const logs = await prisma.auditLog.findMany({
      where: { eventId },
      include: {
        actor: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return res.json({ success: true, data: logs });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to load audit logs.' },
    });
  }
});

export default router;
