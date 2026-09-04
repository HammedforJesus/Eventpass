import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import {
  Calendar,
  MapPin,
  Clock,
  Users,
  Image as ImageIcon,
  ArrowLeft,
  AlertCircle,
  Save,
  CheckCircle2,
  UserCheck,
  LogIn,
} from 'lucide-react';

export const EventCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, login } = useAuth();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [venue, setVenue] = useState('');
  const [address, setAddress] = useState('');

  // Default dates: tomorrow at 09:00, ending at 17:00
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  const [startDate, setStartDate] = useState(tomorrowStr);
  const [startTime, setStartTime] = useState('09:00');
  const [endDate, setEndDate] = useState(tomorrowStr);
  const [endTime, setEndTime] = useState('17:00');

  const [capacity, setCapacity] = useState<number>(150);
  const [rsvpDeadlineDate, setRsvpDeadlineDate] = useState(tomorrowStr);
  const [rsvpDeadlineTime, setRsvpDeadlineTime] = useState('00:00');
  const [bannerUrl, setBannerUrl] = useState(
    'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&auto=format&fit=crop&q=80'
  );

  const [status, setStatus] = useState<'UPCOMING' | 'DRAFT'>('UPCOMING');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloggingIn, setReloggingIn] = useState(false);

  const handleQuickLoginOrganizer = async () => {
    setReloggingIn(true);
    setError(null);
    try {
      const res = await login('organizer@eventpass.io', 'Password123!');
      if (res.success) {
        setError(null);
      } else {
        setError('Could not auto-login as demo organizer: ' + res.error);
      }
    } finally {
      setReloggingIn(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Cross-browser safe ISO date construction (handles iOS Safari and Android Chrome)
    const safeStartTime = startTime.length === 5 ? `${startTime}:00` : startTime;
    const safeEndTime = endTime.length === 5 ? `${endTime}:00` : endTime;
    const startDateTime = new Date(`${startDate}T${safeStartTime}`);
    const endDateTime = new Date(`${endDate}T${safeEndTime}`);

    if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
      setError('Please provide valid start and end dates and times.');
      return;
    }

    if (endDateTime <= startDateTime) {
      setError('Event end date and time must be after the start date and time.');
      return;
    }

    if (capacity <= 0) {
      setError('Capacity must be at least 1.');
      return;
    }

    let rsvpDeadline: string | undefined = undefined;
    if (rsvpDeadlineDate && rsvpDeadlineTime) {
      const safeRsvpTime = rsvpDeadlineTime.length === 5 ? `${rsvpDeadlineTime}:00` : rsvpDeadlineTime;
      const rDate = new Date(`${rsvpDeadlineDate}T${safeRsvpTime}`);
      if (!isNaN(rDate.getTime())) {
        rsvpDeadline = rDate.toISOString();
      }
    }

    setLoading(true);
    try {
      const res = await api.events.create({
        name,
        description,
        venue,
        address,
        startDateTime: startDateTime.toISOString(),
        endDateTime: endDateTime.toISOString(),
        capacity: Number(capacity),
        rsvpDeadline,
        bannerUrl: bannerUrl.trim() || undefined,
        status,
      });

      if (res.success && res.data) {
        navigate(`/events/${res.data.id}`);
      } else {
        setError(res.error?.message || 'Failed to create event.');
      }
    } catch (err: any) {
      setError(err.message || 'Error creating event.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Back button */}
      <Link
        to="/dashboard"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to Dashboard
      </Link>

      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-950 dark:text-white">
          Create New Event
        </h1>
        <p className="text-xs sm:text-sm text-zinc-500">
          Configure schedule, capacity limits, and venue details for your upcoming gathering.
        </p>
      </div>

      {/* Role Alert if logged in as Staff */}
      {user && user.role !== 'ORGANIZER' && (
        <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 rounded-xl text-xs text-amber-800 dark:text-amber-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              You are signed in as <strong>{user.name}</strong> ({user.role}). Creating events requires an <strong>Organizer</strong> account.
            </span>
          </div>
          <button
            type="button"
            onClick={handleQuickLoginOrganizer}
            disabled={reloggingIn}
            className="px-3 py-1.5 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 transition shrink-0 flex items-center gap-1.5 cursor-pointer"
          >
            <UserCheck className="w-3.5 h-3.5" />
            {reloggingIn ? 'Switching...' : 'Switch to Demo Organizer'}
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/80 rounded-xl text-xs text-rose-600 dark:text-rose-400 flex items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Event Creation Notice</p>
              <p className="mt-0.5">{error}</p>
            </div>
          </div>
          {(error.includes('log in') || error.includes('Authentication') || error.includes('privileges')) && (
            <button
              type="button"
              onClick={handleQuickLoginOrganizer}
              disabled={reloggingIn}
              className="px-3 py-1.5 bg-rose-600 text-white rounded-lg font-medium hover:bg-rose-700 transition shrink-0 flex items-center gap-1.5 cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              {reloggingIn ? 'Authenticating...' : 'Sign in as Demo Organizer'}
            </button>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 bg-white dark:bg-zinc-900 p-6 sm:p-8 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
        {/* Event Title */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
            Event Name <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. NextGen Web & AI Conference 2026"
            className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
          />
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Description</label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief overview of the event, agenda highlights, and instructions for guests..."
            className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
          />
        </div>

        {/* Venue and Address */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Venue Name <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                required
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                placeholder="e.g. Grand Horizon Convention Center"
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Physical Address <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. 100 Innovation Way, Suite 400"
              className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
            />
          </div>
        </div>

        {/* Dates and Times */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Start Date & Time <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-xs focus:outline-none"
              />
              <input
                type="time"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-xs focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              End Date & Time <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-xs focus:outline-none"
              />
              <input
                type="time"
                required
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-xs focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Capacity and RSVP Deadline */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Maximum Capacity <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Users className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3.5" />
              <input
                type="number"
                min={1}
                required
                value={capacity}
                onChange={(e) => setCapacity(Number(e.target.value))}
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
              />
            </div>
            <p className="text-[11px] text-zinc-400">Strict limit verified at entrance gates.</p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">RSVP Deadline</label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                value={rsvpDeadlineDate}
                onChange={(e) => setRsvpDeadlineDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-xs focus:outline-none"
              />
              <input
                type="time"
                value={rsvpDeadlineTime}
                onChange={(e) => setRsvpDeadlineTime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-xs focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Banner URL */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Banner Image URL</label>
          <div className="relative">
            <ImageIcon className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3.5" />
            <input
              type="url"
              value={bannerUrl}
              onChange={(e) => setBannerUrl(e.target.value)}
              placeholder="https://images.unsplash.com/..."
              className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
            />
          </div>
          {bannerUrl && (
            <div className="mt-2 h-28 w-full rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800">
              <img src={bannerUrl} alt="Banner Preview" className="w-full h-full object-cover" />
            </div>
          )}
        </div>

        {/* Status Selection */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Publish State</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-xs font-medium text-zinc-700 dark:text-zinc-300 cursor-pointer">
              <input
                type="radio"
                name="status"
                value="UPCOMING"
                checked={status === 'UPCOMING'}
                onChange={() => setStatus('UPCOMING')}
                className="accent-zinc-900 dark:accent-white"
              />
              Publish as Upcoming
            </label>
            <label className="flex items-center gap-2 text-xs font-medium text-zinc-700 dark:text-zinc-300 cursor-pointer">
              <input
                type="radio"
                name="status"
                value="DRAFT"
                checked={status === 'DRAFT'}
                onChange={() => setStatus('DRAFT')}
                className="accent-zinc-900 dark:accent-white"
              />
              Save as Draft
            </label>
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
          <Link
            to="/dashboard"
            className="px-4 py-2.5 rounded-xl text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 rounded-xl bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 text-xs font-semibold hover:opacity-90 transition shadow-sm disabled:opacity-50 cursor-pointer flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {loading ? 'Creating Event...' : 'Create Event & Launch'}
          </button>
        </div>
      </form>
    </div>
  );
};
