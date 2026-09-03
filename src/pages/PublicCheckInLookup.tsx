import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { CheckInInterface } from './CheckInInterface';
import {
  QrCode,
  Search,
  KeyRound,
  ShieldCheck,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

export const PublicCheckInLookup: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tokenInput, setTokenInput] = useState('');

  // If user is logged in as Organizer or Staff, render the full Gate Scanner directly!
  if (user) {
    return <CheckInInterface />;
  }

  const handleLookup = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = tokenInput.trim();
    if (!clean) return;

    // If it's a full URL or contains /invite/
    if (clean.includes('/invite/')) {
      const extracted = clean.split('/invite/')[1].split(/[?#]/)[0];
      navigate(`/invite/${extracted}`);
      return;
    }

    // Direct token
    navigate(`/invite/${clean}`);
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto text-zinc-900 dark:text-white">
            <QrCode className="w-6 h-6 text-emerald-500" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-950 dark:text-white">
            Invitation Pass Lookup
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500">
            Enter your invitation token or paste your invite link to open your pass.
          </p>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-6 sm:p-8 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-5">
          <form onSubmit={handleLookup} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Invitation Token or Link
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  required
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  placeholder="e.g. inv_ab12cd34... or paste URL"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 font-semibold text-sm hover:opacity-90 transition cursor-pointer flex items-center justify-center gap-2 shadow-sm"
            >
              <span>View My Digital Pass</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 text-center space-y-2">
            <p className="text-xs text-zinc-500">
              Are you event door staff or an organizer?
            </p>
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Log in to Gate Scanner Console</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
