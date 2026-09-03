import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api/client';
import { InvitationItem } from '../types';
import { QRCodeDisplay } from '../components/QRCodeDisplay';
import {
  Calendar,
  MapPin,
  Clock,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  User,
  Share2,
  CalendarPlus,
  ArrowRight,
  Sparkles,
  Lock,
} from 'lucide-react';

export const GuestInvitePage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [invitation, setInvitation] = useState<InvitationItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ code?: string; message: string } | null>(null);
  const [updatingRsvp, setUpdatingRsvp] = useState(false);
  const [rsvpFeedback, setRsvpFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    api.invitations
      .get(token)
      .then((res) => {
        if (res.success && res.data) {
          setInvitation(res.data);
        } else {
          setError(res.error || { message: 'Invitation not found.' });
        }
      })
      .catch((err) => {
        setError({ message: err.message || 'Error loading invitation.' });
      })
      .finally(() => {
        setLoading(false);
      });
  }, [token]);

  const handleRsvp = async (status: 'ACCEPTED' | 'DECLINED') => {
    if (!token) return;
    setUpdatingRsvp(true);
    setRsvpFeedback(null);
    try {
      const res = await api.invitations.rsvp(token, status);
      if (res.success && res.data) {
        setInvitation((prev) =>
          prev
            ? {
                ...prev,
                rsvpStatus: res.data.rsvpStatus,
                status: res.data.status,
                rsvpAt: res.data.rsvpAt,
              }
            : null
        );
        setRsvpFeedback(
          status === 'ACCEPTED'
            ? 'Thank you! Your RSVP is confirmed. Show your QR code at the entrance.'
            : 'Thank you for letting us know.'
        );
      } else {
        alert(res.error?.message || 'Failed to update RSVP.');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setUpdatingRsvp(false);
    }
  };

  const getCalendarLink = () => {
    if (!invitation?.event) return '#';
    const ev = invitation.event;
    const startIso = new Date(ev.startDateTime).toISOString().replace(/-|:|\.\d\d\d/g, '');
    const endIso = new Date(ev.endDateTime).toISOString().replace(/-|:|\.\d\d\d/g, '');
    const title = encodeURIComponent(ev.name);
    const details = encodeURIComponent(ev.description || 'EventPass Verified Admission');
    const location = encodeURIComponent(`${ev.venue}, ${ev.address}`);
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startIso}/${endIso}&details=${details}&location=${location}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-3 border-zinc-300 border-t-zinc-900 rounded-full animate-spin mx-auto" />
          <p className="text-xs text-zinc-500 font-mono">Loading digital ticket...</p>
        </div>
      </div>
    );
  }

  if (error || !invitation) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-zinc-900 rounded-3xl p-8 border border-zinc-200 dark:border-zinc-800 shadow-xl text-center space-y-5">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-500 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
              {error?.code === 'INVITATION_REVOKED'
                ? 'Invitation Revoked'
                : error?.code === 'INVITATION_EXPIRED'
                ? 'Invitation Expired'
                : 'Invitation Not Found'}
            </h2>
            <p className="text-xs text-zinc-500">{error?.message || 'This invitation link is invalid.'}</p>
          </div>
          <Link
            to="/"
            className="inline-block px-5 py-2.5 bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 rounded-xl text-xs font-semibold hover:opacity-90 transition"
          >
            Visit EVENTPASS Home
          </Link>
        </div>
      </div>
    );
  }

  const { event, guest } = invitation;
  const startDate = new Date(event.startDateTime);
  const endDate = new Date(event.endDateTime);

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950 py-10 px-4 sm:px-6 flex items-center justify-center">
      <div className="max-w-md w-full bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden space-y-0">
        {/* Banner image or graphic header */}
        {event.bannerUrl ? (
          <div className="h-36 w-full overflow-hidden relative">
            <img src={event.bannerUrl} alt={event.name} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            <div className="absolute bottom-3 left-4 right-4 text-white">
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-sm">
                Official Invitation
              </span>
            </div>
          </div>
        ) : (
          <div className="p-6 bg-zinc-950 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <span className="font-extrabold text-sm tracking-tight">EVENTPASS Verified</span>
            </div>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
              Pass #{invitation.id.slice(0, 6)}
            </span>
          </div>
        )}

        {/* Card Body */}
        <div className="p-6 sm:p-7 space-y-6">
          {/* Event Details */}
          <div className="space-y-2">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-zinc-950 dark:text-white leading-snug">
              {event.name}
            </h1>
            <div className="space-y-1 text-xs text-zinc-600 dark:text-zinc-400">
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                <span>
                  {startDate.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}{' '}
                  at {startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                <span>{event.venue}, {event.address}</span>
              </div>
            </div>
          </div>

          {/* Guest Identity Notch & Pass Details */}
          <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 space-y-2">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-[11px] font-medium text-zinc-400">Invited Guest</span>
                <div className="font-bold text-base text-zinc-900 dark:text-white">{guest.name}</div>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200">
                {guest.category}
              </span>
            </div>
            {guest.plusOne > 0 && (
              <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                Includes admittance for you + {guest.plusOne} guest
              </div>
            )}
          </div>

          {/* Already Checked In Notification */}
          {invitation.isCheckedIn && (
            <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/30 text-emerald-800 dark:text-emerald-200 text-xs flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <div>
                <strong>Checked In at Entrance:</strong> Validated on{' '}
                {new Date(invitation.checkedInAt!).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            </div>
          )}

          {/* QR Code Pass */}
          <div className="pt-2 text-center space-y-2">
            <QRCodeDisplay token={invitation.token} guestName={guest.name} eventName={event.name} />
            <p className="text-[11px] text-zinc-400">
              Present this QR code on arrival for instant admission.
            </p>
          </div>

          {/* RSVP Status / Actions */}
          <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-zinc-600 dark:text-zinc-400">Your RSVP Status:</span>
              <span
                className={`font-bold ${
                  invitation.rsvpStatus === 'ACCEPTED'
                    ? 'text-emerald-600'
                    : invitation.rsvpStatus === 'DECLINED'
                    ? 'text-rose-600'
                    : 'text-zinc-500'
                }`}
              >
                {invitation.rsvpStatus || 'PENDING'}
              </span>
            </div>

            {rsvpFeedback && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium text-center">
                {rsvpFeedback}
              </p>
            )}

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={updatingRsvp || invitation.rsvpStatus === 'ACCEPTED'}
                onClick={() => handleRsvp('ACCEPTED')}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  invitation.rsvpStatus === 'ACCEPTED'
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    : 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 hover:opacity-90'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                {invitation.rsvpStatus === 'ACCEPTED' ? 'Attending ✓' : 'I Will Attend'}
              </button>

              <button
                type="button"
                disabled={updatingRsvp || invitation.rsvpStatus === 'DECLINED'}
                onClick={() => handleRsvp('DECLINED')}
                className={`py-2.5 px-3 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  invitation.rsvpStatus === 'DECLINED'
                    ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200'
                }`}
              >
                <XCircle className="w-3.5 h-3.5" />
                {invitation.rsvpStatus === 'DECLINED' ? 'Declined' : 'Cannot Attend'}
              </button>
            </div>
          </div>

          {/* Calendar & Share Utilities */}
          <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs text-zinc-500">
            <a
              href={getCalendarLink()}
              target="_blank"
              rel="noreferrer"
              className="hover:text-zinc-900 dark:hover:text-white flex items-center gap-1 transition"
            >
              <CalendarPlus className="w-3.5 h-3.5 text-blue-500" />
              Add to Calendar
            </a>

            <span className="flex items-center gap-1 text-[11px] font-mono text-zinc-400">
              <Lock className="w-3 h-3 text-emerald-500" />
              Cryptographically Signed Pass
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
