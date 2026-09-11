import { prisma } from '../db.js';

const EVENT_RETENTION_DAYS = 10;

/** Marks finished events and removes events once they are ten days past their end time. */
export async function cleanupExpiredEvents(): Promise<void> {
  const now = new Date();
  const deletionCutoff = new Date(now.getTime() - EVENT_RETENTION_DAYS * 24 * 60 * 60 * 1000);

  await prisma.event.updateMany({
    where: {
      endDateTime: { lt: now },
      status: { in: ['UPCOMING', 'ACTIVE'] },
    },
    data: { status: 'COMPLETED' },
  });

  await prisma.event.deleteMany({
    where: { endDateTime: { lt: deletionCutoff } },
  });
}

export { EVENT_RETENTION_DAYS };
