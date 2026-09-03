import { prisma } from './db.js';
import {
  hashPassword,
  generateInvitationToken,
  hashToken,
  generate6DigitCode,
  hashCode,
} from './utils/crypto.js';

export async function seedDatabase() {
  console.log('--- Seeding EVENTPASS Database (Development Only) ---');

  // 1. Create Organizer
  const organizerPassword = await hashPassword('Password123!');
  const organizer = await prisma.user.upsert({
    where: { email: 'organizer@eventpass.io' },
    update: {
      passwordHash: organizerPassword,
    },
    create: {
      name: 'Alex Morgan (Organizer)',
      email: 'organizer@eventpass.io',
      passwordHash: organizerPassword,
      role: 'ORGANIZER',
    },
  });

  // 2. Create Staff User
  const staffPassword = await hashPassword('StaffPass2026!');
  const staffUser = await prisma.user.upsert({
    where: { email: 'staff@eventpass.io' },
    update: {
      passwordHash: staffPassword,
    },
    create: {
      name: 'Sarah Connor (Gate Staff)',
      email: 'staff@eventpass.io',
      passwordHash: staffPassword,
      role: 'STAFF',
    },
  });

  // 3. Create Sample Event
  const now = new Date();
  const startDateTime = new Date(now.getTime() + 24 * 60 * 60 * 1000); // tomorrow
  const endDateTime = new Date(now.getTime() + 32 * 60 * 60 * 1000);
  const rsvpDeadline = new Date(now.getTime() + 18 * 60 * 60 * 1000);

  const event = await prisma.event.create({
    data: {
      organizerId: organizer.id,
      name: 'TechVision Global Summit 2026',
      description:
        'The premier conference for artificial intelligence, cloud computing, and next-generation engineering systems.',
      venue: 'Metropolitan Convention Grand Ballroom',
      address: '742 Evergreen Terrace, Tech District, Suite 500',
      startDateTime,
      endDateTime,
      capacity: 250,
      status: 'ACTIVE',
      rsvpDeadline,
      bannerUrl: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&auto=format&fit=crop&q=80',
    },
  });

  // 4. Assign Staff to Event
  await prisma.eventStaff.create({
    data: {
      eventId: event.id,
      userId: staffUser.id,
    },
  });

  // 5. Create Sample Guests with unique invitations
  const guestData = [
    {
      name: 'Dr. Elena Rostova',
      email: 'elena.rostova@quantum.ai',
      phone: '+1 (555) 234-5678',
      category: 'SPEAKER' as const,
      plusOne: 1,
      notes: 'Keynote Speaker on Distributed Systems',
    },
    {
      name: 'Marcus Vance',
      email: 'marcus.vance@apexcap.com',
      phone: '+1 (555) 876-5432',
      category: 'VIP' as const,
      plusOne: 1,
      notes: 'Angel Investor & Panelist',
    },
    {
      name: 'Chloe Bennett',
      email: 'chloe.bennett@wirednews.io',
      phone: '+1 (555) 345-6789',
      category: 'MEDIA' as const,
      plusOne: 0,
      notes: 'Press Pass - Tech Journalism',
    },
    {
      name: 'David Kim',
      email: 'david.kim@devcore.org',
      phone: '+1 (555) 456-7890',
      category: 'REGULAR' as const,
      plusOne: 0,
      notes: 'Early bird registrant',
    },
    {
      name: 'Sophia Patel',
      email: 'sophia.patel@innovate.co',
      phone: '+1 (555) 567-8901',
      category: 'REGULAR' as const,
      plusOne: 0,
      notes: 'General attendee',
    },
  ];

  const seededInvitations: any[] = [];
  const expiresAt = new Date(endDateTime.getTime() + 48 * 60 * 60 * 1000);

  for (let i = 0; i < guestData.length; i++) {
    const g = guestData[i];
    const token = generateInvitationToken();
    const tokenHash = hashToken(token);
    // Use fixed predictable codes for the first two to easily test manual code checkin
    const code = i === 0 ? '123456' : i === 1 ? '654321' : generate6DigitCode();
    const verificationCodeHash = await hashCode(code);

    const guest = await prisma.guest.create({
      data: {
        eventId: event.id,
        name: g.name,
        email: g.email,
        phone: g.phone,
        category: g.category,
        plusOne: g.plusOne,
        notes: g.notes,
      },
    });

    const invitation = await prisma.invitation.create({
      data: {
        guestId: guest.id,
        eventId: event.id,
        token,
        tokenHash,
        verificationCodeHash,
        status: i === 0 ? 'ACCEPTED' : 'PENDING',
        rsvpStatus: i === 0 ? 'ACCEPTED' : 'PENDING',
        rsvpAt: i === 0 ? new Date() : null,
        expiresAt,
      },
    });

    seededInvitations.push({
      guestName: guest.name,
      email: guest.email,
      category: guest.category,
      token,
      verificationCode: code,
      inviteUrl: `/invite/${token}`,
    });
  }

  return {
    message: 'Database seeded successfully with development data.',
    credentials: {
      organizer: {
        email: 'organizer@eventpass.io',
        password: 'Password123!',
      },
      staff: {
        email: 'staff@eventpass.io',
        password: 'StaffPass2026!',
      },
    },
    event: {
      id: event.id,
      name: event.name,
    },
    sampleInvitations: seededInvitations,
  };
}

// Allow standalone command-line run: node server/seed.js
if (process.argv[1]?.endsWith('seed.ts') || process.argv[1]?.endsWith('seed.js')) {
  seedDatabase()
    .then((result) => {
      console.log('Seed completed:', JSON.stringify(result, null, 2));
      process.exit(0);
    })
    .catch((err) => {
      console.error('Seed error:', err);
      process.exit(1);
    });
}
