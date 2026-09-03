import {
  ApiResponse,
  EventItem,
  GuestItem,
  InvitationItem,
  EventStaffItem,
  AnalyticsData,
  AuditLogItem,
  SystemStatus,
  AuthData,
  CheckInResponseData,
  RsvpResponseData,
  SentEmailRecord,
  EmailConfigStatus,
} from '../types';

const TOKEN_KEY = 'eventpass_token';

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string | null): void {
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch {
    // Ignore storage issues in restricted iframes
  }
}

async function request<T>(url: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  const defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const token = getStoredToken();
  if (token) {
    defaultHeaders['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...(options.headers || {}),
    },
    credentials: 'include', // Include HTTP-only cookies
  });

  try {
    const data = await response.json();
    return data;
  } catch (err: any) {
    return {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: 'Network response could not be parsed.',
      },
    };
  }
}

export const api = {
  auth: {
    register: (body: any) => request<AuthData>('/api/auth/register', { method: 'POST', body: JSON.stringify(body) }),
    login: (body: any) => request<AuthData>('/api/auth/login', { method: 'POST', body: JSON.stringify(body) }),
    logout: () => request('/api/auth/logout', { method: 'POST' }),
    me: () => request<AuthData>('/api/auth/me'),
  },
  events: {
    list: () => request<EventItem[]>('/api/events'),
    create: (body: any) => request<EventItem>('/api/events', { method: 'POST', body: JSON.stringify(body) }),
    get: (id: string) => request<EventItem>(`/api/events/${id}`),
    update: (id: string, body: any) => request<EventItem>(`/api/events/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    delete: (id: string) => request(`/api/events/${id}`, { method: 'DELETE' }),
    getGuests: (id: string, params: Record<string, string> = {}) => {
      const qs = new URLSearchParams(params).toString();
      return request<GuestItem[]>(`/api/events/${id}/guests${qs ? `?${qs}` : ''}`);
    },
    addGuest: (id: string, body: any) => request<GuestItem>(`/api/events/${id}/guests`, { method: 'POST', body: JSON.stringify(body) }),
    importGuests: (id: string, guests: any[]) => request(`/api/events/${id}/guests/import`, { method: 'POST', body: JSON.stringify({ guests }) }),
    deleteGuest: (id: string, guestId: string) => request(`/api/events/${id}/guests/${guestId}`, { method: 'DELETE' }),
    revokeInvitation: (id: string, invitationId: string) => request(`/api/events/${id}/invitations/${invitationId}/revoke`, { method: 'POST' }),
    regenerateInvitation: (id: string, invitationId: string) => request(`/api/events/${id}/invitations/${invitationId}/regenerate`, { method: 'POST' }),
    sendInvitation: (id: string, invitationId: string, channel: string = 'EMAIL') =>
      request<{ message: string }>(`/api/events/${id}/invitations/${invitationId}/send`, {
        method: 'POST',
        body: JSON.stringify({ channel }),
      }),
    sendAllInvitations: (id: string) =>
      request<{ sentCount: number; message: string }>(`/api/events/${id}/invitations/send-all`, {
        method: 'POST',
      }),
    getStaff: (id: string) => request<EventStaffItem[]>(`/api/events/${id}/staff`),
    assignStaff: (id: string, body: { email: string; name?: string }) => request<EventStaffItem>(`/api/events/${id}/staff`, { method: 'POST', body: JSON.stringify(body) }),
    removeStaff: (id: string, staffId: string) => request(`/api/events/${id}/staff/${staffId}`, { method: 'DELETE' }),
    getAnalytics: (id: string) => request<AnalyticsData>(`/api/events/${id}/analytics`),
    getAuditLogs: (id: string) => request<AuditLogItem[]>(`/api/events/${id}/audit-logs`),
    getEmails: (id: string) => request<SentEmailRecord[]>(`/api/events/${id}/emails`),
    getEmailConfig: (id: string) => request<EmailConfigStatus>(`/api/events/${id}/email-config`),
    saveEmailConfig: (id: string, body: any) =>
      request<{ message: string }>(`/api/events/${id}/email-config`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    sendTestEmail: (id: string, toEmail?: string) =>
      request<{ message: string; targetEmail: string; deliveryMode: string }>(`/api/events/${id}/test-email`, {
        method: 'POST',
        body: JSON.stringify({ toEmail }),
      }),
  },
  invitations: {
    get: (token: string) => request<InvitationItem>(`/api/invitations/${token}`),
    rsvp: (token: string, status: 'ACCEPTED' | 'DECLINED') =>
      request<RsvpResponseData>(`/api/invitations/${token}/rsvp`, { method: 'POST', body: JSON.stringify({ status }) }),
  },
  checkin: {
    qr: (eventId: string, token: string) =>
      request<CheckInResponseData>('/api/checkin/qr', { method: 'POST', body: JSON.stringify({ eventId, token }) }),
    code: (eventId: string, code: string) =>
      request<CheckInResponseData>('/api/checkin/code', { method: 'POST', body: JSON.stringify({ eventId, code }) }),
  },
  system: {
    status: () => request<SystemStatus>('/api/system/status'),
    seed: () => request('/api/system/seed', { method: 'POST' }),
  },
};
