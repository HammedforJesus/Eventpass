import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  QrCode,
  ShieldCheck,
  Zap,
  Users,
  Lock,
  BarChart3,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Smartphone,
  KeyRound,
  FileCheck2,
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 selection:bg-zinc-900 selection:text-white dark:selection:bg-white dark:selection:text-zinc-900">
      {/* Hero Section */}
      <section className="relative pt-20 pb-24 md:pt-28 md:pb-32 overflow-hidden border-b border-zinc-200/70 dark:border-zinc-800/70">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8 relative z-10">
          {/* Tagline Pill */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-300 shadow-sm">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Cryptographically Verified Event Check-In</span>
          </div>

          <div className="space-y-4 max-w-3xl mx-auto">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-zinc-950 dark:text-white leading-[1.1]">
              Simple. Secure. <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-zinc-900 via-zinc-700 to-zinc-950 dark:from-white dark:via-zinc-300 dark:to-zinc-400">
                Seamless Event Check-In.
              </span>
            </h1>
            <p className="text-base sm:text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto font-normal">
              EVENTPASS provides end-to-end invitation delivery, instant QR verification, 6-digit PIN fallback, and atomic duplicate-proof attendance tracking.
            </p>
          </div>

          {/* Action Buttons (Section 7: Create an Event, Login, Check Invitation) */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link
              to={user ? '/events/new' : '/register'}
              className="px-6 py-3.5 rounded-xl bg-zinc-950 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-zinc-950 font-semibold text-sm transition shadow-md flex items-center gap-2"
            >
              <span>Create an Event</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              to={user ? '/dashboard' : '/login'}
              className="px-6 py-3.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 font-semibold text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
            >
              {user ? 'Organizer Dashboard' : 'Sign In'}
            </Link>

            <Link
              to="/check-in"
              className="px-6 py-3.5 rounded-xl bg-zinc-100 dark:bg-zinc-900/60 border border-zinc-300 dark:border-zinc-700/80 text-zinc-700 dark:text-zinc-300 font-semibold text-sm hover:bg-zinc-200 dark:hover:bg-zinc-800 transition flex items-center gap-1.5"
            >
              <QrCode className="w-4 h-4 text-emerald-500" />
              <span>Gate Check-In & Scanner</span>
            </Link>
          </div>

          {/* Key Trust Badges */}
          <div className="pt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-zinc-500 dark:text-zinc-400">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Real-time Socket.IO Sync
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Atomic Double-Entry Guard
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Rate-Limited 6-Digit PIN
            </span>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-white dark:bg-zinc-900/40 border-b border-zinc-200/70 dark:border-zinc-800/70">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-2 max-w-xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-950 dark:text-white">
              How EVENTPASS Works
            </h2>
            <p className="text-sm text-zinc-500">
              Three synchronized roles working harmoniously for frictionless entry.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="p-6 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-lg">
                1
              </div>
              <h3 className="font-bold text-lg text-zinc-950 dark:text-white">Organizers Invite</h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Create events, import CSV guest lists, and automatically issue unique cryptographically secure digital invitations with QR codes and 6-digit codes.
              </p>
            </div>

            {/* Step 2 */}
            <div className="p-6 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-lg">
                2
              </div>
              <h3 className="font-bold text-lg text-zinc-950 dark:text-white">Guests RSVP</h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Guests open their invitation link on mobile, view venue & schedule details, confirm attendance with one tap, and save their QR pass to their phone.
              </p>
            </div>

            {/* Step 3 */}
            <div className="p-6 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-lg">
                3
              </div>
              <h3 className="font-bold text-lg text-zinc-950 dark:text-white">Staff Verify & Check In</h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                At the door, gate staff scan the QR code or enter the 6-digit fallback PIN. Verification completes in sub-second time with instant audit logging.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Security Architecture */}
      <section className="py-20 border-b border-zinc-200/70 dark:border-zinc-800/70">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-2 max-w-xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-950 dark:text-white">
              Enterprise Security by Default
            </h2>
            <p className="text-sm text-zinc-500">
              Zero plaintext storage, strict authorization barriers, and atomic race-condition locks.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-2.5">
              <Lock className="w-6 h-6 text-zinc-900 dark:text-white" />
              <h4 className="font-semibold text-sm">Opaque QR Tokens</h4>
              <p className="text-xs text-zinc-500 leading-relaxed">
                QR codes contain high-entropy random identifiers, never guest emails, passwords, or personal details.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-2.5">
              <KeyRound className="w-6 h-6 text-zinc-900 dark:text-white" />
              <h4 className="font-semibold text-sm">Rate-Limited 6-Digit PIN</h4>
              <p className="text-xs text-zinc-500 leading-relaxed">
                6-digit codes are stored as bcrypt hashes with throttled attempts to eliminate brute-force vulnerability.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-2.5">
              <Zap className="w-6 h-6 text-zinc-900 dark:text-white" />
              <h4 className="font-semibold text-sm">Atomic Concurrency</h4>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Database transactions and unique constraints guarantee that multiple staff scanning at once cannot double check-in.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-2.5">
              <FileCheck2 className="w-6 h-6 text-zinc-900 dark:text-white" />
              <h4 className="font-semibold text-sm">Immutable Audit Logs</h4>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Every login, invitation generation, revocation, and door scan is recorded with IP and timestamp data.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-white dark:bg-zinc-950 text-xs text-zinc-500 border-t border-zinc-200 dark:border-zinc-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 font-bold text-zinc-900 dark:text-zinc-100">
            <QrCode className="w-4 h-4 text-emerald-500" />
            <span>EVENTPASS</span>
          </div>
          <div>Simple. Secure. Seamless Event Check-In.</div>
          <div>© 2026 EVENTPASS. Built for high-security events.</div>
        </div>
      </footer>
    </div>
  );
};
