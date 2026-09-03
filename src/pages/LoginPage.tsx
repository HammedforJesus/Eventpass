import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, Mail, ArrowRight, AlertCircle, Sparkles } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const result = await login(email, password);
    setLoading(false);

    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.error || 'Invalid email or password.');
    }
  };

  const setDemoCredentials = (role: 'ORGANIZER' | 'STAFF') => {
    if (role === 'ORGANIZER') {
      setEmail('organizer@eventpass.io');
      setPassword('Password123!');
    } else {
      setEmail('staff@eventpass.io');
      setPassword('StaffPass2026!');
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-950 dark:text-white">
            Welcome to EVENTPASS
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500">
            Sign in to manage events, guests, invitations, and door verification.
          </p>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-6 sm:p-8 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-5">
          {error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/80 rounded-xl text-xs text-rose-600 dark:text-rose-400 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="organizer@eventpass.io"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Password</label>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3.5" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 font-semibold text-sm hover:opacity-90 transition disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 shadow-sm"
            >
              {loading ? 'Authenticating...' : 'Sign In'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick-fill Dev Credentials Helper */}
          <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 space-y-2">
            <div className="flex items-center gap-1.5 text-xs text-zinc-500 font-medium">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Quick-fill seed test credentials:</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDemoCredentials('ORGANIZER')}
                className="px-2.5 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 text-left text-xs hover:bg-zinc-50 dark:hover:bg-zinc-800/60 transition cursor-pointer"
              >
                <div className="font-semibold text-zinc-900 dark:text-zinc-100">Organizer Demo</div>
                <div className="text-[10px] text-zinc-500">organizer@eventpass.io</div>
              </button>
              <button
                type="button"
                onClick={() => setDemoCredentials('STAFF')}
                className="px-2.5 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 text-left text-xs hover:bg-zinc-50 dark:hover:bg-zinc-800/60 transition cursor-pointer"
              >
                <div className="font-semibold text-zinc-900 dark:text-zinc-100">Staff Demo</div>
                <div className="text-[10px] text-zinc-500">staff@eventpass.io</div>
              </button>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-zinc-500">
          Don't have an organizer account?{' '}
          <Link to="/register" className="font-semibold text-zinc-900 dark:text-zinc-100 underline">
            Register here
          </Link>
        </p>
      </div>
    </div>
  );
};
