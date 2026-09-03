import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { api } from '../api/client';
import {
  EventItem,
  GuestItem,
  EventStaffItem,
  AnalyticsData,
  AuditLogItem,
  SentEmailRecord,
  EmailConfigStatus,
} from '../types';
import {
  Calendar,
  MapPin,
  Clock,
  Users,
  QrCode,
  ShieldCheck,
  UserPlus,
  Upload,
  Search,
  Filter,
  Trash2,
  RefreshCw,
  Ban,
  Copy,
  Check,
  ExternalLink,
  BarChart3,
  FileText,
  AlertCircle,
  PlusCircle,
  Eye,
  CheckCircle2,
  XCircle,
  Clock3,
  Send,
  Mail,
  MessageSquare,
  Share2,
  CheckCheck,
  Smartphone,
  Inbox,
  Settings,
  Server,
  Globe,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';

export const EventDetailPage: React.FC = () => {
  const { id: eventId } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { joinEvent, leaveEvent, onCheckIn } = useSocket();
  const navigate = useNavigate();

  const [event, setEvent] = useState<EventItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    'overview' | 'guests' | 'invitations' | 'staff' | 'live' | 'analytics' | 'audit'
  >((searchParams.get('tab') as any) || 'overview');

  // Sub-data states
  const [guests, setGuests] = useState<GuestItem[]>([]);
  const [staff, setStaff] = useState<EventStaffItem[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [liveCheckIns, setLiveCheckIns] = useState<any[]>([]);

  // Guest Filters
  const [guestSearch, setGuestSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [rsvpFilter, setRsvpFilter] = useState('ALL');
  const [checkInFilter, setCheckInFilter] = useState('ALL');

  // Modals
  const [showAddGuestModal, setShowAddGuestModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);

  // Add Guest Form
  const [newGuest, setNewGuest] = useState({
    name: '',
    email: '',
    phone: '',
    category: 'REGULAR',
    plusOne: 0,
    notes: '',
  });
  const [sendImmediately, setSendImmediately] = useState(true);

  // Send Invitation Modal State
  const [selectedGuestForInvite, setSelectedGuestForInvite] = useState<{
    guest: GuestItem;
    invitation: any;
  } | null>(null);
  const [sendingInvite, setSendingInvite] = useState(false);
  const [sendFeedback, setSendFeedback] = useState<string | null>(null);
  const [batchSending, setBatchSending] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState(false);

  // Add Staff Form
  const [newStaff, setNewStaff] = useState({ email: '', name: '' });

  // CSV Import State
  const [csvText, setCsvText] = useState('');
  const [importPreview, setImportPreview] = useState<any[]>([]);
  const [importing, setImporting] = useState(false);

  // Copied token tracker
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // Email Outbox & SMTP State
  const [sentEmails, setSentEmails] = useState<SentEmailRecord[]>([]);
  const [emailConfig, setEmailConfig] = useState<EmailConfigStatus | null>(null);
  const [showSmtpModal, setShowSmtpModal] = useState(false);
  const [smtpForm, setSmtpForm] = useState({
    host: '',
    port: 587,
    secure: false,
    user: '',
    pass: '',
    from: '',
  });
  const [savingSmtp, setSavingSmtp] = useState(false);
  const [testEmailInput, setTestEmailInput] = useState('');
  const [sendingTestEmail, setSendingTestEmail] = useState(false);
  const [testEmailFeedback, setTestEmailFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [previewEmailModal, setPreviewEmailModal] = useState<SentEmailRecord | null>(null);
  const [emailPreviewTab, setEmailPreviewTab] = useState<'desktop' | 'mobile'>('desktop');

  // Load Event
  const loadEvent = async () => {
    if (!eventId) return;
    try {
      const res = await api.events.get(eventId);
      if (res.success && res.data) {
        setEvent(res.data);
      } else {
        setError(res.error?.message || 'Failed to load event details.');
      }
    } catch (err: any) {
      setError(err.message || 'Error fetching event.');
    } finally {
      setLoading(false);
    }
  };

  // Load Guests
  const loadGuests = async () => {
    if (!eventId) return;
    try {
      const res = await api.events.getGuests(eventId);
      if (res.success && res.data) {
        setGuests(res.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Load Staff
  const loadStaff = async () => {
    if (!eventId) return;
    try {
      const res = await api.events.getStaff(eventId);
      if (res.success && res.data) {
        setStaff(res.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Load Analytics
  const loadAnalytics = async () => {
    if (!eventId) return;
    try {
      const res = await api.events.getAnalytics(eventId);
      if (res.success && res.data) {
        setAnalytics(res.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Load Audit Logs
  const loadAuditLogs = async () => {
    if (!eventId) return;
    try {
      const res = await api.events.getAuditLogs(eventId);
      if (res.success && res.data) {
        setAuditLogs(res.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Load Sent Emails
  const loadEmails = async () => {
    if (!eventId) return;
    try {
      const res = await api.events.getEmails(eventId);
      if (res.success && res.data) {
        setSentEmails(res.data);
      }
    } catch (err) {
      console.error('Failed to load sent emails:', err);
    }
  };

  // Load Email Config
  const loadEmailConfig = async () => {
    if (!eventId) return;
    try {
      const res = await api.events.getEmailConfig(eventId);
      if (res.success && res.data) {
        setEmailConfig(res.data);
        if (res.data.host) {
          setSmtpForm((prev) => ({
            ...prev,
            host: res.data?.host || '',
            port: res.data?.port || 587,
            user: res.data?.user || '',
            from: res.data?.from || '',
          }));
        }
      }
    } catch (err) {
      console.error('Failed to load email config:', err);
    }
  };

  const handleSaveSmtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventId) return;
    setSavingSmtp(true);
    try {
      const res = await api.events.saveEmailConfig(eventId, smtpForm);
      if (res.success) {
        setShowSmtpModal(false);
        loadEmailConfig();
        alert('SMTP configuration saved successfully! Outgoing emails will now route through your server.');
      } else {
        alert(res.error?.message || 'Failed to save SMTP configuration.');
      }
    } catch (err: any) {
      alert(err.message || 'Error saving SMTP configuration.');
    } finally {
      setSavingSmtp(false);
    }
  };

  const handleClearSmtp = async () => {
    if (!eventId) return;
    if (!confirm('Revert to the built-in test delivery service?')) return;
    setSavingSmtp(true);
    try {
      const res = await api.events.saveEmailConfig(eventId, { clear: true });
      if (res.success) {
        loadEmailConfig();
        setShowSmtpModal(false);
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSavingSmtp(false);
    }
  };

  const handleSendTestEmail = async (target?: string) => {
    if (!eventId) return;
    const to = target || testEmailInput || user?.email;
    if (!to) {
      alert('Please enter a destination email address.');
      return;
    }
    setSendingTestEmail(true);
    setTestEmailFeedback(null);
    try {
      const res = await api.events.sendTestEmail(eventId, to);
      if (res.success) {
        setTestEmailFeedback({
          type: 'success',
          message: `Dispatched test email to ${to} (${res.data?.deliveryMode})! Check outbox below.`,
        });
        loadEmails();
        loadAuditLogs();
      } else {
        setTestEmailFeedback({
          type: 'error',
          message: res.error?.message || 'Failed to send test email.',
        });
      }
    } catch (err: any) {
      setTestEmailFeedback({
        type: 'error',
        message: err.message || 'Error sending test email.',
      });
    } finally {
      setSendingTestEmail(false);
    }
  };

  useEffect(() => {
    loadEvent();
    loadGuests();
    loadStaff();
    loadAnalytics();
    loadAuditLogs();
    loadEmails();
    loadEmailConfig();
  }, [eventId]);

  // Real-time Socket.IO room subscription
  useEffect(() => {
    if (!eventId) return;
    joinEvent(eventId);

    const cleanup = onCheckIn((data) => {
      // Prepend to live stream
      setLiveCheckIns((prev) => [data, ...prev.slice(0, 49)]);
      // Refresh event count and guests
      loadEvent();
      loadGuests();
      loadAnalytics();
    });

    return () => {
      leaveEvent(eventId);
      cleanup();
    };
  }, [eventId]);

  const changeTab = (tab: any) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  // Handle Add Guest
  const handleAddGuest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventId) return;
    try {
      const res = await api.events.addGuest(eventId, {
        ...newGuest,
        sendImmediately,
      });
      if (res.success && res.data) {
        setShowAddGuestModal(false);
        const addedGuest = res.data;
        setNewGuest({ name: '', email: '', phone: '', category: 'REGULAR', plusOne: 0, notes: '' });
        loadGuests();
        loadEvent();
        loadAnalytics();
        loadAuditLogs();
        loadEmails();

        // If send immediately is enabled, open the Send Pass modal right away
        if (sendImmediately && addedGuest.invitation) {
          setSelectedGuestForInvite({
            guest: addedGuest,
            invitation: addedGuest.invitation,
          });
        }
      } else {
        alert(res.error?.message || 'Failed to add guest');
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleOpenSendModal = (guest: GuestItem) => {
    if (!guest.invitation) return;
    setSelectedGuestForInvite({
      guest,
      invitation: guest.invitation,
    });
    setSendFeedback(null);
    setCopiedMessage(false);
  };

  const handleMarkAsSent = async (invitationId: string, channel: string = 'EMAIL') => {
    if (!eventId) return;
    setSendingInvite(true);
    try {
      const res = await api.events.sendInvitation(eventId, invitationId, channel);
      if (res.success) {
        setSendFeedback(res.data?.message || `Invitation dispatched via ${channel}!`);
        loadGuests();
        loadEvent();
        loadAuditLogs();
        loadEmails();
        setTimeout(() => setSendFeedback(null), 4500);
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSendingInvite(false);
    }
  };

  const handleSendAllPending = async () => {
    if (!eventId) return;
    const pendingCount = guests.filter((g) => g.invitation?.status === 'PENDING').length;
    if (pendingCount === 0) {
      alert('No pending invitations to send.');
      return;
    }
    if (!confirm(`Dispatch all ${pendingCount} pending invitation(s)?`)) return;

    setBatchSending(true);
    try {
      const res = await api.events.sendAllInvitations(eventId);
      if (res.success) {
        alert(res.data?.message || `Dispatched ${res.data?.sentCount} invitation(s)!`);
        loadGuests();
        loadEvent();
        loadAuditLogs();
        loadEmails();
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setBatchSending(false);
    }
  };

  // Handle CSV File or Text Parse
  const handleCsvChange = (text: string) => {
    setCsvText(text);
    const lines = text.trim().split('\n');
    if (lines.length < 1) {
      setImportPreview([]);
      return;
    }

    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
    const parsed: any[] = [];

    for (let i = 1; i < lines.length; i++) {
      const row = lines[i].split(',').map((c) => c.trim());
      if (row.length === 0 || !row[0]) continue;

      const nameIndex = headers.indexOf('name') !== -1 ? headers.indexOf('name') : 0;
      const emailIndex = headers.indexOf('email') !== -1 ? headers.indexOf('email') : 1;
      const catIndex = headers.indexOf('category') !== -1 ? headers.indexOf('category') : 2;
      const phoneIndex = headers.indexOf('phone') !== -1 ? headers.indexOf('phone') : -1;

      parsed.push({
        name: row[nameIndex] || '',
        email: row[emailIndex] || '',
        category: (row[catIndex]?.toUpperCase() || 'REGULAR') as any,
        phone: phoneIndex !== -1 ? row[phoneIndex] : '',
      });
    }

    setImportPreview(parsed);
  };

  const handleCsvFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      handleCsvChange(content);
    };
    reader.readAsText(file);
  };

  const handleImportSubmit = async () => {
    if (!eventId || importPreview.length === 0) return;
    setImporting(true);
    try {
      const res = await api.events.importGuests(eventId, importPreview);
      if (res.success) {
        setShowImportModal(false);
        setCsvText('');
        setImportPreview([]);
        loadGuests();
        loadEvent();
        loadAnalytics();
      } else {
        alert(res.error?.message || 'CSV Import failed');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setImporting(false);
    }
  };

  // Revoke Invitation
  const handleRevokeInvitation = async (invitationId: string) => {
    if (!eventId) return;
    if (!confirm('Are you sure you want to revoke this invitation? The guest will no longer be able to check in.')) return;
    try {
      const res = await api.events.revokeInvitation(eventId, invitationId);
      if (res.success) {
        loadGuests();
        loadAnalytics();
      } else {
        alert(res.error?.message || 'Failed to revoke invitation');
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Regenerate Invitation
  const handleRegenerateInvitation = async (invitationId: string) => {
    if (!eventId) return;
    if (!confirm('Regenerating this invitation will invalidate the previous QR code and 6-digit code. Continue?')) return;
    try {
      const res = await api.events.regenerateInvitation(eventId, invitationId);
      if (res.success) {
        loadGuests();
        alert('Invitation regenerated! New credentials issued.');
      } else {
        alert(res.error?.message || 'Failed to regenerate invitation');
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Delete Guest
  const handleDeleteGuest = async (guestId: string) => {
    if (!eventId) return;
    if (!confirm('Are you sure you want to delete this guest and their associated credentials?')) return;
    try {
      const res = await api.events.deleteGuest(eventId, guestId);
      if (res.success) {
        loadGuests();
        loadEvent();
        loadAnalytics();
      } else {
        alert(res.error?.message || 'Failed to delete guest');
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Assign Staff
  const handleAssignStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventId) return;
    try {
      const res = await api.events.assignStaff(eventId, newStaff);
      if (res.success) {
        setShowAddStaffModal(false);
        setNewStaff({ email: '', name: '' });
        loadStaff();
        alert('Staff assigned successfully! They can now log in and scan at the gate.');
      } else {
        alert(res.error?.message || 'Failed to assign staff');
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Remove Staff
  const handleRemoveStaff = async (staffId: string) => {
    if (!eventId) return;
    if (!confirm('Revoke gate check-in permissions for this staff member?')) return;
    try {
      const res = await api.events.removeStaff(eventId, staffId);
      if (res.success) {
        loadStaff();
      } else {
        alert(res.error?.message || 'Failed to remove staff');
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const copyInviteLink = (token: string) => {
    const url = `${window.location.origin}/invite/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  // Filtered Guests list
  const filteredGuests = guests.filter((g) => {
    const matchesSearch =
      g.name.toLowerCase().includes(guestSearch.toLowerCase()) ||
      g.email.toLowerCase().includes(guestSearch.toLowerCase());

    const matchesCategory = categoryFilter === 'ALL' || g.category === categoryFilter;

    const rsvpStatus = g.invitation?.rsvpStatus || 'PENDING';
    const matchesRsvp = rsvpFilter === 'ALL' || rsvpStatus === rsvpFilter;

    const isCheckedIn = Boolean(g.checkIn);
    const matchesCheckIn =
      checkInFilter === 'ALL' ||
      (checkInFilter === 'YES' && isCheckedIn) ||
      (checkInFilter === 'NO' && !isCheckedIn);

    return matchesSearch && matchesCategory && matchesRsvp && matchesCheckIn;
  });

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center space-y-3">
        <div className="w-8 h-8 border-3 border-zinc-300 border-t-zinc-900 rounded-full animate-spin mx-auto" />
        <p className="text-xs text-zinc-500 font-mono">Loading event console...</p>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="p-3 bg-rose-50 dark:bg-rose-950/40 text-rose-600 rounded-full w-fit mx-auto">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Event Not Found</h2>
        <p className="text-xs text-zinc-500">{error || 'This event could not be found or you do not have access.'}</p>
        <Link
          to="/dashboard"
          className="inline-block px-4 py-2 bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 rounded-xl text-xs font-semibold"
        >
          Return to Dashboard
        </Link>
      </div>
    );
  }

  const startDate = new Date(event.startDateTime);
  const totalInvited = guests.length;
  const totalCheckedIn = guests.filter((g) => Boolean(g.checkIn)).length;
  const attendanceRate = totalInvited > 0 ? Math.round((totalCheckedIn / totalInvited) * 100) : 0;
  const remainingCapacity = Math.max(0, event.capacity - totalCheckedIn);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Event Header Banner */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
        {event.bannerUrl && (
          <div className="h-44 w-full overflow-hidden bg-zinc-100 dark:bg-zinc-800">
            <img src={event.bannerUrl} alt={event.name} className="w-full h-full object-cover" />
          </div>
        )}

        <div className="p-6 sm:p-8 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-zinc-950 dark:text-white">
                  {event.name}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  {event.status}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-500">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  {startDate.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })} at{' '}
                  {startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" />
                  {event.venue}, {event.address}
                </span>
              </div>
            </div>

            {/* Direct Action: Gate Check-In */}
            <div className="flex items-center gap-2.5">
              <Link
                to={`/events/${event.id}/check-in`}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center gap-2 cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Launch Gate Check-In</span>
              </Link>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
            <div className="space-y-0.5">
              <div className="text-[11px] font-medium text-zinc-400">Total Guests</div>
              <div className="text-xl font-bold text-zinc-900 dark:text-white">{totalInvited}</div>
            </div>
            <div className="space-y-0.5">
              <div className="text-[11px] font-medium text-zinc-400">Checked In</div>
              <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{totalCheckedIn}</div>
            </div>
            <div className="space-y-0.5">
              <div className="text-[11px] font-medium text-zinc-400">Remaining Capacity</div>
              <div className="text-xl font-bold text-zinc-900 dark:text-white">{remainingCapacity}</div>
            </div>
            <div className="space-y-0.5">
              <div className="text-[11px] font-medium text-zinc-400">Attendance Rate</div>
              <div className="text-xl font-bold text-blue-600 dark:text-blue-400">{attendanceRate}%</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 overflow-x-auto border-b border-zinc-200 dark:border-zinc-800 pb-2 text-xs font-semibold">
        {[
          { key: 'overview', label: 'Overview' },
          { key: 'guests', label: `Guest Roster (${guests.length})` },
          { key: 'invitations', label: 'Invitations & Passes' },
          { key: 'emails', label: `Email Outbox (${sentEmails.length})` },
          { key: 'staff', label: `Gate Staff (${staff.length})` },
          { key: 'live', label: 'Live Stream' },
          { key: 'analytics', label: 'Analytics' },
          { key: 'audit', label: 'Audit Trail' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => changeTab(tab.key)}
            className={`px-3.5 py-2 rounded-xl transition cursor-pointer whitespace-nowrap ${
              activeTab === tab.key
                ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-sm'
                : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-3">
              <h3 className="font-bold text-sm text-zinc-900 dark:text-white">About This Event</h3>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                {event.description || 'No description provided.'}
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-zinc-900 dark:text-white">Attendance Progress</h3>
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  {totalCheckedIn} of {event.capacity} maximum capacity
                </span>
              </div>

              <div className="w-full h-3 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all"
                  style={{ width: `${Math.min(100, (totalCheckedIn / event.capacity) * 100)}%` }}
                />
              </div>

              <div className="flex justify-between text-[11px] text-zinc-500">
                <span>0 Checked In</span>
                <span>{event.capacity} Capacity Limit</span>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-4">
              <h3 className="font-bold text-sm text-zinc-900 dark:text-white">Quick Actions</h3>
              <div className="space-y-2">
                <button
                  onClick={() => setShowAddGuestModal(true)}
                  className="w-full py-2.5 px-3.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-xl text-xs font-semibold text-zinc-800 dark:text-zinc-200 transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" /> Add Single Guest
                </button>
                <button
                  onClick={() => setShowImportModal(true)}
                  className="w-full py-2.5 px-3.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-xl text-xs font-semibold text-zinc-800 dark:text-zinc-200 transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Upload className="w-4 h-4" /> Import CSV Roster
                </button>
                <Link
                  to={`/events/${event.id}/check-in`}
                  className="w-full py-2.5 px-3.5 bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 rounded-xl text-xs font-semibold hover:opacity-90 transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <QrCode className="w-4 h-4 text-emerald-400" /> Open Gate Scanner
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: GUEST ROSTER */}
      {activeTab === 'guests' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Search name or email..."
                  value={guestSearch}
                  onChange={(e) => setGuestSearch(e.target.value)}
                  className="pl-9 pr-3 py-2 rounded-xl text-xs border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 focus:outline-none w-56"
                />
              </div>

              {/* Category Filter */}
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-2 rounded-xl text-xs border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 focus:outline-none"
              >
                <option value="ALL">All Categories</option>
                <option value="VIP">VIP</option>
                <option value="SPEAKER">Speaker</option>
                <option value="REGULAR">Regular</option>
                <option value="MEDIA">Media</option>
                <option value="SPONSOR">Sponsor</option>
              </select>

              {/* RSVP Filter */}
              <select
                value={rsvpFilter}
                onChange={(e) => setRsvpFilter(e.target.value)}
                className="px-3 py-2 rounded-xl text-xs border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 focus:outline-none"
              >
                <option value="ALL">All RSVPs</option>
                <option value="ACCEPTED">Accepted</option>
                <option value="DECLINED">Declined</option>
                <option value="PENDING">Pending</option>
              </select>

              {/* Check-in Filter */}
              <select
                value={checkInFilter}
                onChange={(e) => setCheckInFilter(e.target.value)}
                className="px-3 py-2 rounded-xl text-xs border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 focus:outline-none"
              >
                <option value="ALL">Check-in Status</option>
                <option value="YES">Checked In</option>
                <option value="NO">Not Checked In</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAddGuestModal(true)}
                className="px-3.5 py-2 bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 rounded-xl text-xs font-semibold hover:opacity-90 transition flex items-center gap-1.5 cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                Add Guest
              </button>
              <button
                onClick={() => setShowImportModal(true)}
                className="px-3.5 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 rounded-xl text-xs font-semibold hover:bg-zinc-200 dark:hover:bg-zinc-700 transition flex items-center gap-1.5 cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                Import CSV
              </button>
            </div>
          </div>

          {/* Guests Table */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50 dark:bg-zinc-950/60 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 font-semibold">
                  <tr>
                    <th className="p-3.5">Guest</th>
                    <th className="p-3.5">Category</th>
                    <th className="p-3.5">RSVP Status</th>
                    <th className="p-3.5">Check-In</th>
                    <th className="p-3.5">Digital Pass</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60 text-zinc-700 dark:text-zinc-300">
                  {filteredGuests.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-zinc-500">
                        No guests matching current filters.
                      </td>
                    </tr>
                  ) : (
                    filteredGuests.map((g) => {
                      const isCheckedIn = Boolean(g.checkIn);
                      const inv = g.invitation;

                      return (
                        <tr key={g.id} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/40">
                          <td className="p-3.5">
                            <div className="font-semibold text-zinc-900 dark:text-white">{g.name}</div>
                            <div className="text-[11px] text-zinc-400 font-mono">{g.email}</div>
                          </td>
                          <td className="p-3.5">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                              {g.category}
                            </span>
                            {g.plusOne > 0 && (
                              <span className="ml-1.5 text-[10px] text-zinc-400">+{g.plusOne}</span>
                            )}
                          </td>
                          <td className="p-3.5">
                            {inv?.rsvpStatus === 'ACCEPTED' && (
                              <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Accepted
                              </span>
                            )}
                            {inv?.rsvpStatus === 'DECLINED' && (
                              <span className="inline-flex items-center gap-1 text-rose-600 font-semibold">
                                <XCircle className="w-3.5 h-3.5" /> Declined
                              </span>
                            )}
                            {(!inv || inv.rsvpStatus === 'PENDING') && (
                              <span className="inline-flex items-center gap-1 text-zinc-400">
                                <Clock3 className="w-3.5 h-3.5" /> Pending
                              </span>
                            )}
                          </td>
                          <td className="p-3.5">
                            {isCheckedIn ? (
                              <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                {new Date(g.checkIn!.checkedInAt).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            ) : (
                              <span className="text-zinc-400">Awaiting Arrival</span>
                            )}
                          </td>
                          <td className="p-3.5">
                            {inv && (
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => handleOpenSendModal(g)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 text-[11px] font-semibold hover:opacity-90 transition cursor-pointer shadow-xs"
                                  title="Send or share invitation pass immediately"
                                >
                                  <Send className="w-3 h-3" />
                                  <span>{inv.status === 'PENDING' ? 'Send Invite' : 'Share'}</span>
                                </button>
                                <button
                                  onClick={() => copyInviteLink(inv.token)}
                                  className="p-1.5 text-zinc-500 hover:text-zinc-900 dark:hover:text-white rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                                  title="Copy invite URL"
                                >
                                  {copiedToken === inv.token ? (
                                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                                  ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                  )}
                                </button>
                                <Link
                                  to={`/invite/${inv.token}`}
                                  target="_blank"
                                  className="p-1.5 text-zinc-500 hover:text-zinc-900 dark:hover:text-white rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
                                  title="Preview Invitation"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </Link>
                              </div>
                            )}
                          </td>
                          <td className="p-3.5 text-right">
                            <button
                              onClick={() => handleDeleteGuest(g.id)}
                              className="p-1.5 text-zinc-400 hover:text-rose-600 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                              title="Delete Guest"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: INVITATIONS */}
      {activeTab === 'invitations' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-600 dark:text-zinc-400 flex flex-wrap items-center justify-between gap-3">
            <div>
              <strong>Invitation Dispatch & Security:</strong> Each guest receives an opaque invitation token (SHA-256 hashed in database) and a 6-digit gate code.
              <div className="mt-1 text-zinc-500 flex items-center gap-3">
                <span>Total: <strong>{guests.length}</strong></span>
                <span>•</span>
                <span>Pending: <strong>{guests.filter((g) => g.invitation?.status === 'PENDING').length}</strong></span>
                <span>•</span>
                <span>Sent / Active: <strong>{guests.filter((g) => g.invitation?.status !== 'PENDING' && g.invitation?.status !== 'REVOKED').length}</strong></span>
              </div>
            </div>
            {guests.filter((g) => g.invitation?.status === 'PENDING').length > 0 && (
              <button
                onClick={handleSendAllPending}
                disabled={batchSending}
                className="px-3.5 py-2 bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 font-semibold rounded-xl text-xs hover:opacity-90 transition flex items-center gap-2 cursor-pointer shadow-sm"
              >
                <Send className="w-3.5 h-3.5" />
                {batchSending ? 'Dispatching...' : `Send All Pending Invites (${guests.filter((g) => g.invitation?.status === 'PENDING').length})`}
              </button>
            )}
          </div>

          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50 dark:bg-zinc-950/60 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 font-semibold">
                  <tr>
                    <th className="p-3.5">Guest Name</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5">Expires</th>
                    <th className="p-3.5">Invite Link</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60 text-zinc-700 dark:text-zinc-300">
                  {guests.map((g) => {
                    const inv = g.invitation;
                    if (!inv) return null;

                    return (
                      <tr key={inv.id} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/40">
                        <td className="p-3.5 font-semibold text-zinc-900 dark:text-white">
                          {g.name}
                        </td>
                        <td className="p-3.5">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              inv.status === 'REVOKED'
                                ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                : inv.status === 'CHECKED_IN'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : inv.status === 'EXPIRED'
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                            }`}
                          >
                            {inv.status}
                          </span>
                        </td>
                        <td className="p-3.5 text-zinc-500">
                          {new Date(inv.expiresAt).toLocaleDateString()}
                        </td>
                        <td className="p-3.5 font-mono text-[11px] text-zinc-500">
                          <div className="flex items-center gap-2">
                            <span>/invite/{inv.token.slice(0, 8)}...</span>
                            <button
                              onClick={() => copyInviteLink(inv.token)}
                              className="p-1 text-zinc-500 hover:text-zinc-900 cursor-pointer"
                              title="Copy URL"
                            >
                              {copiedToken === inv.token ? (
                                <Check className="w-3.5 h-3.5 text-emerald-500" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                            <Link to={`/invite/${inv.token}`} target="_blank" className="p-1 text-zinc-500 hover:text-zinc-900">
                              <ExternalLink className="w-3.5 h-3.5" />
                            </Link>
                          </div>
                        </td>
                        <td className="p-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenSendModal(g)}
                              className="p-1.5 text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                              title="Send or share pass"
                            >
                              <Send className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleRegenerateInvitation(inv.id)}
                              className="p-1.5 text-zinc-500 hover:text-zinc-900 dark:hover:text-white rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                              title="Regenerate credentials"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                            </button>
                            {inv.status !== 'REVOKED' && (
                              <button
                                onClick={() => handleRevokeInvitation(inv.id)}
                                className="p-1.5 text-zinc-500 hover:text-rose-600 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                                title="Revoke invitation"
                              >
                                <Ban className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB: EMAIL OUTBOX & DELIVERIES */}
      {activeTab === 'emails' && (
        <div className="space-y-6">
          {/* Header & Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <Mail className="w-4 h-4 text-blue-500" />
                <span>Automated Email Outbox &amp; Delivery Receipts</span>
              </h3>
              <p className="text-xs text-zinc-500">
                Live audit of all invitation emails sent to guests with delivery timestamps and rendered previews.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowSmtpModal(true)}
                className="px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition flex items-center gap-1.5 cursor-pointer"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Configure SMTP</span>
                {emailConfig?.configured && (
                  <span className="w-2 h-2 rounded-full bg-emerald-500" title="Custom SMTP Active" />
                )}
              </button>
              <button
                onClick={() => {
                  loadEmails();
                  loadEmailConfig();
                }}
                className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                title="Refresh Outbox"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Delivery Configuration Status Banner */}
          <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm space-y-3">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div className="flex items-start gap-3">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    emailConfig?.configured
                      ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400'
                      : 'bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400'
                  }`}
                >
                  <Server className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-zinc-900 dark:text-white">
                      {emailConfig?.configured
                        ? `Live SMTP Active (${emailConfig.host})`
                        : 'Simulated & Test Delivery Mode'}
                    </h4>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        emailConfig?.configured
                          ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                          : 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                      }`}
                    >
                      {emailConfig?.configured ? 'LIVE DELIVERY' : 'LOCAL / TEST'}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    {emailConfig?.configured
                      ? `Outgoing invitation emails are sent directly through ${emailConfig.host} from "${emailConfig.from || emailConfig.user}".`
                      : 'Invitations are generated, logged, and rendered immediately. To send real emails directly to external inboxes, connect your SMTP account (e.g. Gmail App Password, SendGrid, or Brevo).'}
                  </p>
                </div>
              </div>

              {/* Inline Test Sender */}
              <div className="flex items-center gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-zinc-100 dark:border-zinc-800">
                <input
                  type="email"
                  value={testEmailInput}
                  onChange={(e) => setTestEmailInput(e.target.value)}
                  placeholder={user?.email || 'your@email.com'}
                  className="px-3 py-1.5 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 focus:outline-none w-48 font-mono"
                />
                <button
                  type="button"
                  disabled={sendingTestEmail}
                  onClick={() => handleSendTestEmail()}
                  className="px-3 py-1.5 bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 rounded-xl text-xs font-semibold hover:opacity-90 transition disabled:opacity-50 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  <Send className="w-3 h-3" />
                  <span>{sendingTestEmail ? 'Sending...' : 'Test Send'}</span>
                </button>
              </div>
            </div>

            {testEmailFeedback && (
              <div
                className={`p-2.5 rounded-xl text-xs flex items-center gap-2 ${
                  testEmailFeedback.type === 'success'
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                    : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                }`}
              >
                {testEmailFeedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                )}
                <span>{testEmailFeedback.message}</span>
              </div>
            )}
          </div>

          {/* Sent Emails Outbox Table */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
            <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
              <h4 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider">
                Dispatched Invitations ({sentEmails.length})
              </h4>
              <span className="text-[11px] text-zinc-400">
                Click any email to inspect the exact HTML ticket sent to the guest
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50 dark:bg-zinc-950/60 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 font-semibold">
                  <tr>
                    <th className="p-3.5">Recipient</th>
                    <th className="p-3.5">Subject</th>
                    <th className="p-3.5">Transport Mode</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5">Dispatched At</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                  {sentEmails.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-12 text-center text-zinc-500">
                        <Inbox className="w-8 h-8 mx-auto mb-2 text-zinc-400" />
                        <p className="font-semibold">No emails in outbox yet</p>
                        <p className="text-[11px] text-zinc-400 mt-1 max-w-sm mx-auto">
                          When you add a guest with "Send Immediately" enabled or click "Send Invite", the email is
                          dispatched automatically and logged here.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    sentEmails.map((mail) => {
                      const gmailWebUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
                        mail.recipientEmail
                      )}&su=${encodeURIComponent(mail.subject)}&body=${encodeURIComponent(
                        `Hi ${mail.recipientName},\n\nHere is your invitation pass:\n${mail.passUrl}\n\nSee you there!`
                      )}`;

                      return (
                        <tr key={mail.id} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/40 transition">
                          <td className="p-3.5">
                            <div className="font-semibold text-zinc-900 dark:text-white">{mail.recipientName}</div>
                            <div className="text-[11px] text-zinc-400 font-mono">{mail.recipientEmail}</div>
                          </td>
                          <td className="p-3.5 max-w-xs truncate text-zinc-700 dark:text-zinc-300">
                            {mail.subject}
                          </td>
                          <td className="p-3.5">
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                mail.deliveryMode === 'SMTP'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                  : mail.deliveryMode === 'ETHEREAL'
                                  ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                                  : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                              }`}
                            >
                              {mail.deliveryMode}
                            </span>
                          </td>
                          <td className="p-3.5">
                            <span
                              className={`inline-flex items-center gap-1 text-[11px] font-semibold ${
                                mail.status === 'SENT' || mail.status === 'SIMULATED'
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : 'text-rose-600 dark:text-rose-400'
                              }`}
                            >
                              <Check className="w-3 h-3" />
                              <span>{mail.status === 'SENT' ? 'Delivered' : 'Dispatched'}</span>
                            </span>
                          </td>
                          <td className="p-3.5 text-zinc-500 font-mono text-[11px]">
                            {new Date(mail.sentAt).toLocaleString([], {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </td>
                          <td className="p-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* View HTML ticket */}
                              <button
                                onClick={() => setPreviewEmailModal(mail)}
                                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition flex items-center gap-1 cursor-pointer"
                                title="Inspect rendered HTML ticket email"
                              >
                                <Eye className="w-3 h-3" />
                                <span>View Email</span>
                              </button>

                              {/* Open test inbox preview if available */}
                              {mail.previewUrl && (
                                <a
                                  href={mail.previewUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1 text-purple-600 hover:text-purple-700 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/50 rounded-lg transition"
                                  title="Open live webmail preview"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                              )}

                              {/* 1-click open in Gmail */}
                              <a
                                href={gmailWebUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition"
                                title="Open in Gmail Web composer"
                              >
                                <Mail className="w-3.5 h-3.5" />
                              </a>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: STAFF MANAGEMENT */}
      {activeTab === 'staff' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Assigned Gate Staff</h3>
              <p className="text-xs text-zinc-500">
                Staff members are authorized to scan QR codes and enter 6-digit codes at entrance gates.
              </p>
            </div>
            <button
              onClick={() => setShowAddStaffModal(true)}
              className="px-3.5 py-2 bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 rounded-xl text-xs font-semibold hover:opacity-90 transition flex items-center gap-1.5 cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Assign Staff
            </button>
          </div>

          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50 dark:bg-zinc-950/60 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 font-semibold">
                <tr>
                  <th className="p-3.5">Staff Member</th>
                  <th className="p-3.5">Email</th>
                  <th className="p-3.5">Assigned On</th>
                  <th className="p-3.5 text-right">Remove</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                {staff.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-zinc-500">
                      No staff assigned yet. Click "Assign Staff" to grant door scanner access.
                    </td>
                  </tr>
                ) : (
                  staff.map((s) => (
                    <tr key={s.id} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/40">
                      <td className="p-3.5 font-semibold text-zinc-900 dark:text-white">{s.user.name}</td>
                      <td className="p-3.5 text-zinc-500 font-mono">{s.user.email}</td>
                      <td className="p-3.5 text-zinc-500">{new Date(s.assignedAt).toLocaleDateString()}</td>
                      <td className="p-3.5 text-right">
                        <button
                          onClick={() => handleRemoveStaff(s.id)}
                          className="p-1.5 text-zinc-400 hover:text-rose-600 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: LIVE CHECK-IN STREAM */}
      {activeTab === 'live' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-200">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
              <span className="text-xs font-bold uppercase tracking-wider">Live Socket.IO Stream Active</span>
            </div>
            <span className="text-xs">{totalCheckedIn} checked in</span>
          </div>

          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 space-y-3 shadow-sm">
            <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Incoming Check-Ins</h4>
            {liveCheckIns.length === 0 ? (
              <div className="py-12 text-center text-xs text-zinc-400 font-mono">
                Awaiting first scan at gate... Live updates will appear here automatically without refreshing.
              </div>
            ) : (
              <div className="space-y-2">
                {liveCheckIns.map((ci, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-xs animate-fade-in"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                        ✓
                      </div>
                      <div>
                        <div className="font-semibold text-zinc-900 dark:text-white">{ci.guestName}</div>
                        <div className="text-[10px] text-zinc-400">Verified by {ci.checkedInBy}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                        {ci.category}
                      </span>
                      <div className="text-[10px] text-zinc-400 font-mono mt-1">
                        {new Date(ci.checkedInAt).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 6: ANALYTICS */}
      {activeTab === 'analytics' && analytics && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* RSVP Breakdown */}
            <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-4">
              <h4 className="text-sm font-bold text-zinc-900 dark:text-white">RSVP Status Breakdown</h4>
              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[
                      { name: 'Accepted', count: analytics.rsvpCounts.ACCEPTED },
                      { name: 'Declined', count: analytics.rsvpCounts.DECLINED },
                      { name: 'Pending', count: analytics.rsvpCounts.PENDING },
                    ]}
                  >
                    <XAxis dataKey="name" stroke="#71717a" fontSize={11} />
                    <YAxis stroke="#71717a" fontSize={11} allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#10b981" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Category Breakdown */}
            <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-4">
              <h4 className="text-sm font-bold text-zinc-900 dark:text-white">Guest Categories</h4>
              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.categoryCounts}>
                    <XAxis dataKey="category" stroke="#71717a" fontSize={11} />
                    <YAxis stroke="#71717a" fontSize={11} allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#6366f1" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 7: AUDIT TRAIL */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50 dark:bg-zinc-950/60 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 font-semibold">
                <tr>
                  <th className="p-3.5">Timestamp</th>
                  <th className="p-3.5">Action</th>
                  <th className="p-3.5">Actor</th>
                  <th className="p-3.5">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60 font-mono text-[11px]">
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-zinc-500 font-sans">
                      No audit events recorded yet.
                    </td>
                  </tr>
                ) : (
                  auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/40">
                      <td className="p-3.5 text-zinc-500">{new Date(log.createdAt).toLocaleString()}</td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 font-semibold">
                          {log.action}
                        </span>
                      </td>
                      <td className="p-3.5 text-zinc-700 dark:text-zinc-300">
                        {log.actor?.name || 'System'}
                      </td>
                      <td className="p-3.5 text-zinc-500 max-w-xs truncate">
                        {log.metadata ? JSON.stringify(log.metadata) : '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ADD GUEST MODAL */}
      {showAddGuestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl text-zinc-800 dark:text-zinc-200">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
              <h3 className="font-bold text-base">Add Guest to Event</h3>
              <button
                onClick={() => setShowAddGuestModal(false)}
                className="text-zinc-400 hover:text-zinc-600 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddGuest} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-semibold">Full Name *</label>
                <input
                  type="text"
                  required
                  value={newGuest.name}
                  onChange={(e) => setNewGuest({ ...newGuest, name: e.target.value })}
                  placeholder="Elena Rostova"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold">Email Address *</label>
                <input
                  type="email"
                  required
                  value={newGuest.email}
                  onChange={(e) => setNewGuest({ ...newGuest, email: e.target.value })}
                  placeholder="elena@company.com"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold">Category</label>
                  <select
                    value={newGuest.category}
                    onChange={(e) => setNewGuest({ ...newGuest, category: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 focus:outline-none"
                  >
                    <option value="REGULAR">Regular</option>
                    <option value="VIP">VIP</option>
                    <option value="SPEAKER">Speaker</option>
                    <option value="MEDIA">Media</option>
                    <option value="SPONSOR">Sponsor</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold">Plus One Allowed</label>
                  <input
                    type="number"
                    min={0}
                    max={5}
                    value={newGuest.plusOne}
                    onChange={(e) => setNewGuest({ ...newGuest, plusOne: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold">Phone (Optional)</label>
                <input
                  type="tel"
                  value={newGuest.phone}
                  onChange={(e) => setNewGuest({ ...newGuest, phone: e.target.value })}
                  placeholder="+1 (555) 000-0000"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 focus:outline-none"
                />
              </div>

              <div className="p-3 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Send className="w-4 h-4 text-zinc-500 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">Send Invitation Immediately</p>
                    <p className="text-[11px] text-zinc-500">Open delivery options (Email, WhatsApp, SMS, Share) right after saving</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={sendImmediately}
                  onChange={(e) => setSendImmediately(e.target.checked)}
                  className="w-4 h-4 accent-zinc-900 rounded cursor-pointer"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowAddGuestModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 rounded-xl hover:opacity-90"
                >
                  Save & Generate Invitation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV IMPORT MODAL */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl text-zinc-800 dark:text-zinc-200">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
              <div>
                <h3 className="font-bold text-base">Bulk Import Guests (CSV)</h3>
                <p className="text-xs text-zinc-500">Headers: name, email, category, phone</p>
              </div>
              <button
                onClick={() => setShowImportModal(false)}
                className="text-zinc-400 hover:text-zinc-600 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <label className="block p-4 border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl text-center cursor-pointer hover:border-zinc-400">
                <Upload className="w-6 h-6 mx-auto text-zinc-400 mb-1" />
                <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Click to select CSV file or drop here
                </span>
                <input type="file" accept=".csv,text/csv" onChange={handleCsvFileUpload} className="hidden" />
              </label>

              <div className="space-y-1">
                <label className="text-xs font-semibold">Or paste CSV text directly:</label>
                <textarea
                  rows={4}
                  value={csvText}
                  onChange={(e) => handleCsvChange(e.target.value)}
                  placeholder={`name,email,category\nAlice Smith,alice@example.com,VIP\nBob Jones,bob@example.com,SPEAKER`}
                  className="w-full p-2.5 text-xs font-mono rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 focus:outline-none"
                />
              </div>

              {importPreview.length > 0 && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
                  <span>
                    <strong>{importPreview.length}</strong> valid guests recognized.
                  </span>
                  <span className="text-[11px]">Unique QR tokens will be generated.</span>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2 text-xs font-semibold text-zinc-500 hover:bg-zinc-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={importPreview.length === 0 || importing}
                onClick={handleImportSubmit}
                className="px-4 py-2 text-xs font-semibold bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 rounded-xl hover:opacity-90 disabled:opacity-50"
              >
                {importing ? 'Importing...' : `Import ${importPreview.length} Guests`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ASSIGN STAFF MODAL */}
      {showAddStaffModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl text-zinc-800 dark:text-zinc-200">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
              <h3 className="font-bold text-base">Assign Gate Staff</h3>
              <button
                onClick={() => setShowAddStaffModal(false)}
                className="text-zinc-400 hover:text-zinc-600 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAssignStaff} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-semibold">Staff Email Address *</label>
                <input
                  type="email"
                  required
                  value={newStaff.email}
                  onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })}
                  placeholder="staff@eventpass.io"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold">Staff Name (Optional if already registered)</label>
                <input
                  type="text"
                  value={newStaff.name}
                  onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })}
                  placeholder="Sarah Connor"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowAddStaffModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-zinc-500 hover:bg-zinc-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 rounded-xl hover:opacity-90"
                >
                  Assign to Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* SEND INVITATION MODAL */}
      {selectedGuestForInvite && event && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl text-zinc-800 dark:text-zinc-200">
            <div className="flex items-start justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-base text-zinc-950 dark:text-white">Send Invitation Pass</h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 uppercase">
                    {selectedGuestForInvite.invitation.status}
                  </span>
                </div>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Deliver the secure digital ticket to <strong>{selectedGuestForInvite.guest.name}</strong>
                </p>
              </div>
              <button
                onClick={() => setSelectedGuestForInvite(null)}
                className="text-zinc-400 hover:text-zinc-600 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            {sendFeedback && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 rounded-xl text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                <CheckCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>{sendFeedback}</span>
              </div>
            )}

            {/* Recipient info & Pass link */}
            <div className="p-3.5 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-500">Recipient:</span>
                <span className="font-semibold text-zinc-900 dark:text-white">
                  {selectedGuestForInvite.guest.name} &lt;{selectedGuestForInvite.guest.email}&gt;
                </span>
              </div>
              {selectedGuestForInvite.guest.phone && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-500">Phone:</span>
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">
                    {selectedGuestForInvite.guest.phone}
                  </span>
                </div>
              )}
              <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-2">
                <div className="truncate font-mono text-[11px] text-zinc-500 flex-1">
                  {window.location.origin}/invite/{selectedGuestForInvite.invitation.token}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => copyInviteLink(selectedGuestForInvite.invitation.token)}
                    className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 transition flex items-center gap-1 cursor-pointer"
                  >
                    {copiedToken === selectedGuestForInvite.invitation.token ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Link</span>
                      </>
                    )}
                  </button>
                  <Link
                    to={`/invite/${selectedGuestForInvite.invitation.token}`}
                    target="_blank"
                    className="p-1 text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                    title="Open Pass in new tab"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </div>

            {/* Delivery Channels Grid */}
            <div className="space-y-3">
              {/* Primary Automated Dispatch */}
              <div className="p-3.5 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/50 dark:bg-blue-950/20 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span className="text-xs font-bold text-zinc-900 dark:text-white">
                      Automated Server Email Dispatch
                    </span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      emailConfig?.configured
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                    }`}
                  >
                    {emailConfig?.configured ? 'SMTP ACTIVE' : 'TEST MODE'}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-500">
                  Sends the formatted digital pass with gate QR code to{' '}
                  <strong className="text-zinc-700 dark:text-zinc-300 font-mono">
                    {selectedGuestForInvite.guest.email}
                  </strong>
                  .
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    disabled={sendingInvite}
                    onClick={() => handleMarkAsSent(selectedGuestForInvite.invitation.id, 'EMAIL')}
                    className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{sendingInvite ? 'Dispatching...' : 'Dispatch Email Now'}</span>
                  </button>

                  {/* Check if already in sent emails */}
                  {(() => {
                    const existing = sentEmails.find(
                      (m) => m.recipientEmail.toLowerCase() === selectedGuestForInvite.guest.email.toLowerCase()
                    );
                    if (existing) {
                      return (
                        <button
                          type="button"
                          onClick={() => setPreviewEmailModal(existing)}
                          className="px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View Rendered Ticket</span>
                        </button>
                      );
                    }
                    return null;
                  })()}
                </div>
              </div>

              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block">
                Direct Client &amp; Webmail Options:
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* 1. Gmail Web 1-click */}
                {(() => {
                  const passUrl = `${window.location.origin}/invite/${selectedGuestForInvite.invitation.token}`;
                  const subject = `Your Invitation: ${event.name}`;
                  const body = `Hi ${selectedGuestForInvite.guest.name},\n\nYou are invited to ${event.name}!\n\n📅 Date: ${new Date(
                    event.startDateTime
                  ).toLocaleDateString()} at ${new Date(event.startDateTime).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}\n📍 Venue: ${event.venue}, ${event.address}\n\nAccess your digital event pass and gate QR code here:\n${passUrl}\n\nPlease click the link to confirm your RSVP and save your pass to your mobile device.\n\nSee you there!`;
                  const gmailWebUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
                    selectedGuestForInvite.guest.email
                  )}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

                  return (
                    <a
                      href={gmailWebUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => handleMarkAsSent(selectedGuestForInvite.invitation.id, 'GMAIL_WEB')}
                      className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-rose-400 dark:hover:border-rose-600 bg-zinc-50 dark:bg-zinc-950 flex items-center gap-3 transition group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                        <Mail className="w-4 h-4" />
                      </div>
                      <div className="text-left flex-1 min-w-0">
                        <p className="text-xs font-bold text-zinc-900 dark:text-white group-hover:text-rose-600 transition">
                          Gmail Web
                        </p>
                        <p className="text-[11px] text-zinc-500 truncate">
                          Opens in browser Gmail
                        </p>
                      </div>
                    </a>
                  );
                })()}

                {/* 2. Default Email Client */}
                {(() => {
                  const passUrl = `${window.location.origin}/invite/${selectedGuestForInvite.invitation.token}`;
                  const subject = `Your Invitation: ${event.name}`;
                  const body = `Hi ${selectedGuestForInvite.guest.name},\n\nYou are invited to ${event.name}!\n\n📅 Date: ${new Date(
                    event.startDateTime
                  ).toLocaleDateString()} at ${new Date(event.startDateTime).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}\n📍 Venue: ${event.venue}, ${event.address}\n\nAccess your digital event pass and gate QR code here:\n${passUrl}\n\nPlease click the link to confirm your RSVP and save your pass to your mobile device.\n\nSee you there!`;
                  const mailtoUrl = `mailto:${encodeURIComponent(
                    selectedGuestForInvite.guest.email
                  )}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

                  return (
                    <a
                      href={mailtoUrl}
                      onClick={() => handleMarkAsSent(selectedGuestForInvite.invitation.id, 'MAILTO')}
                      className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600 bg-zinc-50 dark:bg-zinc-950 flex items-center gap-3 transition group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                        <Mail className="w-4 h-4" />
                      </div>
                      <div className="text-left flex-1 min-w-0">
                        <p className="text-xs font-bold text-zinc-900 dark:text-white group-hover:text-blue-600 transition">
                          Default Email App
                        </p>
                        <p className="text-[11px] text-zinc-500 truncate">
                          Apple Mail, Outlook, etc.
                        </p>
                      </div>
                    </a>
                  );
                })()}

                {/* 3. WhatsApp */}
                {(() => {
                  const passUrl = `${window.location.origin}/invite/${selectedGuestForInvite.invitation.token}`;
                  const text = `Hi ${selectedGuestForInvite.guest.name}! Here is your invitation and gate pass for *${event.name}*:\n\n📅 ${new Date(
                    event.startDateTime
                  ).toLocaleDateString()}\n📍 ${event.venue}\n\n👉 Access your pass: ${passUrl}`;
                  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;

                  return (
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => handleMarkAsSent(selectedGuestForInvite.invitation.id, 'WHATSAPP')}
                      className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-emerald-400 dark:hover:border-emerald-600 bg-zinc-50 dark:bg-zinc-950 flex items-center gap-3 transition group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                        <MessageSquare className="w-4 h-4" />
                      </div>
                      <div className="text-left flex-1 min-w-0">
                        <p className="text-xs font-bold text-zinc-900 dark:text-white group-hover:text-emerald-600 transition">
                          WhatsApp
                        </p>
                        <p className="text-[11px] text-zinc-500 truncate">
                          Send pass via chat
                        </p>
                      </div>
                    </a>
                  );
                })()}

                {/* 4. SMS or Copy Message */}
                {selectedGuestForInvite.guest.phone ? (
                  (() => {
                    const passUrl = `${window.location.origin}/invite/${selectedGuestForInvite.invitation.token}`;
                    const text = `Hi ${selectedGuestForInvite.guest.name}, your pass for ${event.name} is ready: ${passUrl}`;
                    const smsUrl = `sms:${selectedGuestForInvite.guest.phone}?body=${encodeURIComponent(text)}`;

                    return (
                      <a
                        href={smsUrl}
                        onClick={() => handleMarkAsSent(selectedGuestForInvite.invitation.id, 'SMS')}
                        className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-purple-400 dark:hover:border-purple-600 bg-zinc-50 dark:bg-zinc-950 flex items-center gap-3 transition group"
                      >
                        <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                          <Smartphone className="w-4 h-4" />
                        </div>
                        <div className="text-left flex-1 min-w-0">
                          <p className="text-xs font-bold text-zinc-900 dark:text-white group-hover:text-purple-600 transition">
                            SMS Message
                          </p>
                          <p className="text-[11px] text-zinc-500 truncate">
                            {selectedGuestForInvite.guest.phone}
                          </p>
                        </div>
                      </a>
                    );
                  })()
                ) : (
                  <button
                    onClick={() => {
                      const passUrl = `${window.location.origin}/invite/${selectedGuestForInvite.invitation.token}`;
                      const fullMessage = `Hi ${selectedGuestForInvite.guest.name},\n\nYou are invited to ${event.name}!\n\n📅 Date: ${new Date(
                        event.startDateTime
                      ).toLocaleDateString()}\n📍 Venue: ${event.venue}\n\nAccess your digital pass & QR code here:\n${passUrl}`;
                      navigator.clipboard.writeText(fullMessage);
                      setCopiedMessage(true);
                      setTimeout(() => setCopiedMessage(false), 2500);
                    }}
                    className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600 bg-zinc-50 dark:bg-zinc-950 flex items-center gap-3 transition group cursor-pointer text-left"
                  >
                    <div className="w-8 h-8 rounded-lg bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center shrink-0">
                      {copiedMessage ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    </div>
                    <div className="text-left flex-1 min-w-0">
                      <p className="text-xs font-bold text-zinc-900 dark:text-white">
                        {copiedMessage ? 'Message Copied!' : 'Copy Formatted Text'}
                      </p>
                      <p className="text-[11px] text-zinc-500 truncate">
                        With event details &amp; pass link
                      </p>
                    </div>
                  </button>
                )}
              </div>
            </div>

            {/* Modal footer actions */}
            <div className="flex items-center justify-between pt-3 border-t border-zinc-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => handleMarkAsSent(selectedGuestForInvite.invitation.id, 'DIRECT')}
                disabled={sendingInvite}
                className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-white font-medium cursor-pointer"
              >
                {sendingInvite ? 'Updating...' : 'Mark as Sent'}
              </button>
              <button
                type="button"
                onClick={() => setSelectedGuestForInvite(null)}
                className="px-4 py-2 text-xs font-semibold bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 rounded-xl hover:opacity-90 cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: PREVIEW RENDERED HTML TICKET EMAIL */}
      {previewEmailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-3xl w-full h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-zinc-900 dark:text-white truncate max-w-md">
                    {previewEmailModal.subject}
                  </h3>
                  <p className="text-xs text-zinc-500 font-mono">
                    To: {previewEmailModal.recipientName} &lt;{previewEmailModal.recipientEmail}&gt;
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Device width toggles */}
                <div className="bg-zinc-100 dark:bg-zinc-800 rounded-lg p-0.5 flex text-xs font-medium">
                  <button
                    onClick={() => setEmailPreviewTab('desktop')}
                    className={`px-2.5 py-1 rounded-md transition ${
                      emailPreviewTab === 'desktop'
                        ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-xs'
                        : 'text-zinc-500 hover:text-zinc-900'
                    }`}
                  >
                    Desktop
                  </button>
                  <button
                    onClick={() => setEmailPreviewTab('mobile')}
                    className={`px-2.5 py-1 rounded-md transition ${
                      emailPreviewTab === 'mobile'
                        ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-xs'
                        : 'text-zinc-500 hover:text-zinc-900'
                    }`}
                  >
                    Mobile (375px)
                  </button>
                </div>

                <button
                  onClick={() => setPreviewEmailModal(null)}
                  className="text-zinc-400 hover:text-zinc-600 text-lg p-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Email Meta Bar */}
            <div className="px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-100 dark:border-zinc-800 text-[11px] text-zinc-500 flex flex-wrap items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-3 font-mono">
                <span>Mode: <strong>{previewEmailModal.deliveryMode}</strong></span>
                <span>•</span>
                <span>Status: <strong>{previewEmailModal.status}</strong></span>
                <span>•</span>
                <span>Sent: {new Date(previewEmailModal.sentAt).toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={previewEmailModal.passUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                >
                  <span>Open Ticket Web Pass</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            {/* Email Body Iframe Container */}
            <div className="flex-1 bg-zinc-100 dark:bg-zinc-950/80 p-4 overflow-auto flex justify-center items-start">
              <div
                className={`bg-white rounded-xl shadow-md overflow-hidden transition-all duration-300 ${
                  emailPreviewTab === 'mobile' ? 'w-[375px] min-h-[600px]' : 'w-full max-w-2xl min-h-[600px]'
                }`}
              >
                <iframe
                  title="Rendered Ticket Email"
                  srcDoc={previewEmailModal.htmlContent}
                  className="w-full h-[600px] border-none"
                  sandbox="allow-same-origin allow-popups"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-white dark:bg-zinc-900 shrink-0">
              <span className="text-xs text-zinc-400">
                This is the pixel-perfect HTML email template rendered by the server.
              </span>
              <button
                onClick={() => setPreviewEmailModal(null)}
                className="px-4 py-1.5 text-xs font-semibold bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 rounded-xl hover:opacity-90"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CONFIGURE SMTP CREDENTIALS */}
      {showSmtpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl text-zinc-800 dark:text-zinc-200">
            <div className="flex items-start justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <div>
                <h3 className="font-bold text-base text-zinc-950 dark:text-white flex items-center gap-2">
                  <Server className="w-4 h-4 text-blue-500" />
                  <span>Outgoing SMTP Server Settings</span>
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Connect any standard email provider to deliver invitations directly to real user inboxes.
                </p>
              </div>
              <button
                onClick={() => setShowSmtpModal(false)}
                className="text-zinc-400 hover:text-zinc-600 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900 text-xs text-blue-800 dark:text-blue-200 space-y-1">
              <p className="font-semibold">Quick setup guides:</p>
              <ul className="list-disc list-inside text-[11px] space-y-0.5 text-zinc-600 dark:text-zinc-400">
                <li>
                  <strong>Gmail / Google Workspace:</strong> Host: <code className="font-mono">smtp.gmail.com</code>, Port: 587, User: your email, Password: Google <em>App Password</em> (created at myaccount.google.com/apppasswords).
                </li>
                <li>
                  <strong>SendGrid:</strong> Host: <code className="font-mono">smtp.sendgrid.net</code>, Port: 587, User: <code className="font-mono">apikey</code>, Password: your SendGrid API key.
                </li>
                <li>
                  <strong>Brevo / Sendinblue:</strong> Host: <code className="font-mono">smtp-relay.brevo.com</code>, Port: 587.
                </li>
              </ul>
            </div>

            <form onSubmit={handleSaveSmtp} className="space-y-3">
              <div className="grid grid-cols-3 gap-2.5">
                <div className="col-span-2 space-y-1">
                  <label className="text-xs font-semibold">SMTP Host *</label>
                  <input
                    type="text"
                    required
                    value={smtpForm.host}
                    onChange={(e) => setSmtpForm({ ...smtpForm, host: e.target.value })}
                    placeholder="smtp.gmail.com"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 focus:outline-none font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold">Port *</label>
                  <input
                    type="number"
                    required
                    value={smtpForm.port}
                    onChange={(e) => setSmtpForm({ ...smtpForm, port: Number(e.target.value) })}
                    placeholder="587"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold">Username / Email *</label>
                <input
                  type="text"
                  required
                  value={smtpForm.user}
                  onChange={(e) => setSmtpForm({ ...smtpForm, user: e.target.value })}
                  placeholder="organizer@gmail.com"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 focus:outline-none font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold">Password / App Password *</label>
                <input
                  type="password"
                  required
                  value={smtpForm.pass}
                  onChange={(e) => setSmtpForm({ ...smtpForm, pass: e.target.value })}
                  placeholder="••••••••••••••••"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 focus:outline-none font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold">Sender Display Name &amp; Address (Optional)</label>
                <input
                  type="text"
                  value={smtpForm.from}
                  onChange={(e) => setSmtpForm({ ...smtpForm, from: e.target.value })}
                  placeholder={`EVENTPASS <${smtpForm.user || 'no-reply@eventpass.io'}>`}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="smtpSecure"
                  checked={smtpForm.secure}
                  onChange={(e) => setSmtpForm({ ...smtpForm, secure: e.target.checked })}
                  className="rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="smtpSecure" className="text-xs text-zinc-600 dark:text-zinc-400">
                  Use SSL/TLS directly (port 465). For port 587 leave unchecked (uses STARTTLS).
                </label>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-zinc-100 dark:border-zinc-800">
                {emailConfig?.configured ? (
                  <button
                    type="button"
                    onClick={handleClearSmtp}
                    disabled={savingSmtp}
                    className="text-xs text-rose-600 hover:text-rose-700 font-semibold cursor-pointer"
                  >
                    Clear &amp; Revert to Test Mode
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowSmtpModal(false)}
                    className="px-4 py-2 text-xs font-semibold text-zinc-500 hover:bg-zinc-100 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingSmtp}
                    className="px-4 py-2 text-xs font-semibold bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 rounded-xl hover:opacity-90 disabled:opacity-50"
                  >
                    {savingSmtp ? 'Saving...' : 'Save & Connect'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
