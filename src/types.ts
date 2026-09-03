export type Role = 'ORGANIZER' | 'STAFF';

export type EventStatus = 'DRAFT' | 'UPCOMING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

export type GuestCategory = 'VIP' | 'REGULAR' | 'SPEAKER' | 'STAFF' | 'MEDIA' | 'OTHER';

export type InvitationStatus =
  | 'PENDING'
  | 'SENT'
  | 'VIEWED'
  | 'ACCEPTED'
  | 'DECLINED'
  | 'CHECKED_IN'
  | 'REVOKED'
  | 'EXPIRED';

export type RsvpStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: string;
}

export interface AuthData {
  user: User;
  token?: string;
  databaseConnected?: boolean;
}

export interface EventItem {
  id: string;
  organizerId: string;
  name: string;
  description: string | null;
  venue: string;
  address: string;
  startDateTime: string;
  endDateTime: string;
  capacity: number;
  status: EventStatus;
  rsvpDeadline: string | null;
  bannerUrl: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: {
    guests: number;
    invitations: number;
    checkIns: number;
    staff: number;
  };
}

export interface GuestItem {
  id: string;
  eventId: string;
  name: string;
  email: string;
  phone: string | null;
  category: GuestCategory;
  plusOne: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  invitation?: InvitationItem | null;
  checkIn?: CheckInItem | null;
}

export interface InvitationItem {
  id: string;
  guestId: string;
  eventId: string;
  token: string;
  status: InvitationStatus;
  rsvpStatus: RsvpStatus;
  rsvpAt: string | null;
  expiresAt: string;
  revokedAt?: string | null;
  viewedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  rawVerificationCode?: string;
  isCheckedIn?: boolean;
  checkedInAt?: string | null;
  guest: {
    id?: string;
    name: string;
    email: string;
    category: GuestCategory;
    phone?: string | null;
    plusOne?: number;
  };
  event: {
    id: string;
    name: string;
    venue: string;
    address: string;
    startDateTime: string;
    endDateTime: string;
    status: EventStatus;
    bannerUrl: string | null;
    description?: string | null;
  };
  checkIn?: CheckInItem | null;
}

export interface EventStaffItem {
  id: string;
  eventId: string;
  userId: string;
  assignedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: Role;
  };
}

export interface CheckInItem {
  id: string;
  eventId: string;
  guestId: string;
  invitationId: string;
  checkedInBy: string;
  checkedInAt: string;
  guest?: {
    name: string;
    category: GuestCategory;
  };
  staffUser?: {
    name: string;
    email: string;
  };
}

export interface AuditLogItem {
  id: string;
  actorId: string | null;
  eventId: string | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  metadata: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  actor?: {
    name: string;
    email: string;
  } | null;
}

export interface AnalyticsData {
  totalInvited: number;
  rsvpCounts: {
    ACCEPTED: number;
    DECLINED: number;
    PENDING: number;
  };
  checkedIn: number;
  capacity: number;
  remainingCapacity: number;
  categoryCounts: { category: string; count: number }[];
  timeline: { time: string; count: number }[];
}

export interface CheckInResponseData {
  message: string;
  guest: {
    id: string;
    name: string;
    category: string;
    plusOne: number;
  };
  checkIn: {
    id: string;
    checkedInAt: string;
    checkedInBy: string;
  };
  stats: {
    totalInvited: number;
    checkedIn: number;
    remaining: number;
    attendanceRate: number;
    capacity: number;
  };
}

export interface RsvpResponseData {
  rsvpStatus: RsvpStatus;
  rsvpAt: string;
  status: InvitationStatus;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
    guest?: {
      name: string;
      category: string;
      checkedInAt?: string;
    };
  };
}

export interface SystemStatus {
  database: {
    connected: boolean;
    type: 'mysql' | 'sqlite';
    databaseUrlConfigured: boolean;
    maskedUrl: string;
    error: string | null;
  };
  serverTime: string;
  version: string;
}

export interface SentEmailRecord {
  id: string;
  eventId: string;
  guestId?: string;
  invitationId?: string;
  recipientEmail: string;
  recipientName: string;
  subject: string;
  htmlContent: string;
  textContent: string;
  passUrl: string;
  status: 'SENT' | 'SIMULATED' | 'FAILED';
  deliveryMode: 'SMTP' | 'ETHEREAL' | 'SIMULATED';
  previewUrl?: string | null;
  messageId?: string;
  error?: string | null;
  sentAt: string;
}

export interface EmailConfigStatus {
  configured: boolean;
  host: string | null;
  port: number | null;
  user: string | null;
  from: string | null;
  mode: 'CUSTOM_SMTP' | 'TEST_SERVICE';
}

