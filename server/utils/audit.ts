import { Request } from 'express';
import { prisma, checkDatabaseConnection } from '../db.js';

export async function logAudit(options: {
  actorId?: string | null;
  eventId?: string | null;
  action: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, any> | string;
  req?: Request;
}) {
  try {
    const { connected } = await checkDatabaseConnection();
    if (!connected) return;

    let ipAddress: string | null = null;
    let userAgent: string | null = null;

    if (options.req) {
      ipAddress = (options.req.ip || options.req.socket.remoteAddress || null) as string | null;
      userAgent = options.req.headers['user-agent'] || null;
    }

    const metadataStr =
      typeof options.metadata === 'object'
        ? JSON.stringify(options.metadata)
        : options.metadata || null;

    await prisma.auditLog.create({
      data: {
        actorId: options.actorId || null,
        eventId: options.eventId || null,
        action: options.action,
        targetType: options.targetType || null,
        targetId: options.targetId || null,
        metadata: metadataStr,
        ipAddress,
        userAgent,
      },
    });
  } catch (err) {
    // Audit logging should not crash the primary operational request if it fails
    console.error('Failed to record audit log:', err);
  }
}
