import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { EventItem } from '../types';
import {
  Calendar,
  PlusCircle,
  Users,
  CheckCircle2,
  TrendingUp,
  MapPin,
  Clock,
  QrCode,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  ExternalLink,
  Sparkles,
  BarChart2,
} from 'lucide-react';

export const OrganizerDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.events.list();
      if (res.success && res.data) {
        setEvents(res.data);
      } else {
        setError(res.error?.message || 'Failed to fetch events.');
      }
    } catch (err: any) {
      setError(err.message || 'Error loading dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  // Compute aggregate stats across events
  const totalEvents = events.length;
  const upcomingEvents = events.filter((e) => e.status === 'UPCOMING' || e.status === 'ACTIVE').length;
  const totalGuests = events.reduce((acc, e) => acc + (e._count?.guests || 0), 0);
  const totalCheckedIn = events.reduce((acc, e) => acc + (e._count?.checkIns || 0), 0);
  const aggregateAttendanceRate =
    totalGuests > 0 ? Math.round((totalCheckedIn / totalGuests) * 100) : 0;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300">
            Active
          </span>
        );
      case 'UPCOMING':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300">
            Upcoming
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
            Completed
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300">
            Cancelled
          </span>
        );
      case 'DRAFT':
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300">
            Draft
          </span>
        );
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-950 dark:text-white">
            {user?.role === 'STAFF' ? 'Assigned Gate Events' : 'Event Operations Dashboard'}
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500">
            {user?.role === 'STAFF'
              ? 'Select an assigned event to launch the Gate Check-In interface.'
              : 'Real-time overview of your scheduled events, attendance rates, and guest invitations.'}
          </p>
        </div>

        {user?.role === 'ORGANIZER' && (
          <Link
            to="/events/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 rounded-xl text-sm font-semibold hover:opacity-90 transition shadow-sm self-start sm:self-auto"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create New Event</span>
          </Link>
        )}
      </div>

      {/* Summary Cards Grid (Section 9) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-1">
          <div className="text-xs font-medium text-zinc-500 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" /> Total Events
          </div>
          <div className="text-2xl font-bold text-zinc-900 dark:text-white">{totalEvents}</div>
          <div className="text-[11px] text-zinc-400">{upcomingEvents} active or upcoming</div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-1">
          <div className="text-xs font-medium text-zinc-500 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" /> Total Guests
          </div>
          <div className="text-2xl font-bold text-zinc-900 dark:text-white">{totalGuests}</div>
          <div className="text-[11px] text-zinc-400">Across all rosters</div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-1">
          <div className="text-xs font-medium text-zinc-500 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Checked In
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{totalCheckedIn}</div>
          <div className="text-[11px] text-zinc-400">Verified at entrance</div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-1">
          <div className="text-xs font-medium text-zinc-500 flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-blue-500" /> Attendance Rate
          </div>
          <div className="text-2xl font-bold text-zinc-900 dark:text-white">{aggregateAttendanceRate}%</div>
          <div className="text-[11px] text-zinc-400">Global check-in ratio</div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-1 col-span-2 sm:col-span-1">
          <div className="text-xs font-medium text-zinc-500 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> Security Mode
          </div>
          <div className="text-lg font-bold text-zinc-900 dark:text-white pt-1">Double-Lock</div>
          <div className="text-[11px] text-zinc-400">QR + 6-Digit Code</div>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/80 rounded-xl text-xs text-rose-600 dark:text-rose-400 flex items-start gap-2.5">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold text-sm">Dashboard Message</div>
            <div>{error}</div>
          </div>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="py-16 text-center space-y-3">
          <div className="w-8 h-8 border-3 border-zinc-300 dark:border-zinc-700 border-t-zinc-900 dark:border-t-zinc-100 rounded-full animate-spin mx-auto" />
          <p className="text-xs text-zinc-500 font-mono">Loading events from database...</p>
        </div>
      )}

      {/* Events List */}
      {!loading && events.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <span>Your Events</span>
            <span className="text-xs font-normal text-zinc-500">({events.length})</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {events.map((ev) => {
              const start = new Date(ev.startDateTime);
              const dateStr = start.toLocaleDateString([], {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              });
              const timeStr = start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

              const guestCount = ev._count?.guests || 0;
              const checkInCount = ev._count?.checkIns || 0;
              const rate = guestCount > 0 ? Math.round((checkInCount / guestCount) * 100) : 0;

              return (
                <div
                  key={ev.id}
                  className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden flex flex-col justify-between hover:border-zinc-300 dark:hover:border-zinc-700 transition"
                >
                  {/* Event Banner Image or Placeholder */}
                  {ev.bannerUrl ? (
                    <div className="h-32 w-full overflow-hidden bg-zinc-100 dark:bg-zinc-800 relative">
                      <img
                        src={ev.bannerUrl}
                        alt={ev.name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-2.5 right-2.5">{getStatusBadge(ev.status)}</div>
                    </div>
                  ) : (
                    <div className="h-24 w-full bg-gradient-to-r from-zinc-100 to-zinc-200 dark:from-zinc-900 dark:to-zinc-800 p-3 flex justify-end items-start">
                      {getStatusBadge(ev.status)}
                    </div>
                  )}

                  <div className="p-5 space-y-4 flex-1">
                    <div>
                      <h3 className="font-bold text-base text-zinc-950 dark:text-white line-clamp-1">
                        {ev.name}
                      </h3>
                      {ev.description && (
                        <p className="text-xs text-zinc-500 line-clamp-2 mt-1">{ev.description}</p>
                      )}
                    </div>

                    <div className="space-y-1.5 text-xs text-zinc-600 dark:text-zinc-400">
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                        <span>{dateStr} · {timeStr}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                        <span className="truncate">{ev.venue}, {ev.address}</span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1.5 pt-2 border-t border-zinc-100 dark:border-zinc-800/80">
                      <div className="flex justify-between text-xs">
                        <span className="text-zinc-500">Attendance ({rate}%)</span>
                        <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                          {checkInCount} / {guestCount} checked in
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all"
                          style={{ width: `${Math.min(100, rate)}%` }}
                        />
                      </div>
                      <div className="text-[11px] text-zinc-400 text-right">
                        Capacity: {ev.capacity}
                      </div>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="p-3 bg-zinc-50 dark:bg-zinc-950/60 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between gap-2">
                    <Link
                      to={`/events/${ev.id}`}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition"
                    >
                      Manage Event
                    </Link>

                    <Link
                      to={`/events/${ev.id}/check-in`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 hover:opacity-90 transition shadow-sm"
                    >
                      <QrCode className="w-3.5 h-3.5 text-emerald-400 dark:text-emerald-600" />
                      <span>Gate Scan</span>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty State (Section 72) */}
      {!loading && events.length === 0 && (
        <div className="p-12 text-center rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-4 max-w-lg mx-auto">
          <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-500 flex items-center justify-center mx-auto">
            <Calendar className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-lg text-zinc-900 dark:text-white">No Events Found</h3>
            <p className="text-xs text-zinc-500">
              {user?.role === 'STAFF'
                ? 'You have not been assigned to any events yet. Ask your event organizer to assign you.'
                : 'Create your first event to start issuing secure invitations and tracking attendance.'}
            </p>
          </div>
          {user?.role === 'ORGANIZER' && (
            <Link
              to="/events/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 rounded-xl text-xs font-semibold hover:opacity-90 transition"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create Event</span>
            </Link>
          )}
        </div>
      )}
    </div>
  );
};
