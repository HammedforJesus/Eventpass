import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { DatabaseStatusBanner } from './DatabaseStatusBanner';
import {
  QrCode,
  Calendar,
  PlusCircle,
  LogOut,
  Menu,
  X,
  User as UserIcon,
  ShieldCheck,
  Search,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 z-40 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md border-b border-zinc-200/80 dark:border-zinc-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-xl bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 flex items-center justify-center font-black shadow-md group-hover:scale-105 transition">
                <QrCode className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold text-lg tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center gap-1.5">
                  EVENTPASS
                  <span className="text-[10px] font-semibold tracking-wide uppercase px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                    Pro
                  </span>
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            {user && (
              <nav className="hidden md:flex items-center gap-1 ml-4">
                <Link
                  to="/dashboard"
                  className={`px-3.5 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${
                    isActive('/dashboard') || isActive('/events')
                      ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                  }`}
                >
                  <Calendar className="w-4 h-4" />
                  Events
                </Link>

                {user.role === 'ORGANIZER' && (
                  <Link
                    to="/events/new"
                    className={`px-3.5 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${
                      isActive('/events/new')
                        ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white'
                        : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                    }`}
                  >
                    <PlusCircle className="w-4 h-4" />
                    New Event
                  </Link>
                )}

                <Link
                  to="/check-in"
                  className={`px-3.5 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${
                    isActive('/check-in')
                      ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  Gate Check-In
                </Link>
              </nav>
            )}
          </div>

          {/* Right Section: DB Status, Search Invitation, User menu */}
          <div className="hidden md:flex items-center gap-4">
            <DatabaseStatusBanner />

            <Link
              to="/check-in"
              className="text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition"
              title="Lookup guest invitation by token or 6-digit code"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Check Invitation</span>
            </Link>

            {user ? (
              <div className="flex items-center gap-3 pl-2 border-l border-zinc-200 dark:border-zinc-800">
                <div className="flex flex-col text-right">
                  <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate max-w-[140px]">
                    {user.name}
                  </span>
                  <span
                    className={`text-[10px] font-bold tracking-wider uppercase px-1.5 py-0.2 rounded w-fit self-end ${
                      user.role === 'ORGANIZER'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
                    }`}
                  >
                    {user.role}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 text-zinc-500 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                  title="Log out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="px-3.5 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white transition"
                >
                  Log In
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 text-sm font-semibold rounded-xl bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 hover:opacity-90 transition shadow-sm"
                >
                  Create Account
                </Link>
              </div>
            )}
          </div>

          {/* Mobile hamburger button */}
          <div className="md:hidden flex items-center gap-2">
            <DatabaseStatusBanner />
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-zinc-700 dark:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-4 pt-3 pb-6 space-y-3">
          {user ? (
            <>
              <div className="flex items-center gap-3 p-3 bg-zinc-50 dark:bg-zinc-900 rounded-xl">
                <div className="w-9 h-9 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-zinc-700 dark:text-zinc-300 font-bold text-sm">
                  {user.name.charAt(0)}
                </div>
                <div>
                  <div className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">{user.name}</div>
                  <div className="text-xs text-zinc-500">{user.email} · {user.role}</div>
                </div>
              </div>

              <nav className="space-y-1">
                <Link
                  to="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  <Calendar className="w-4 h-4" />
                  Events Dashboard
                </Link>

                {user.role === 'ORGANIZER' && (
                  <Link
                    to="/events/new"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  >
                    <PlusCircle className="w-4 h-4" />
                    Create New Event
                  </Link>
                )}

                <Link
                  to="/check-in"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  Gate Check-In
                </Link>
              </nav>

              <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleLogout();
                  }}
                  className="w-full flex items-center gap-2 px-3.5 py-2.5 rounded-lg text-sm font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </>
          ) : (
            <div className="space-y-2 pt-2">
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="block text-center py-2.5 px-4 rounded-xl text-sm font-medium border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200"
              >
                Log In
              </Link>
              <Link
                to="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="block text-center py-2.5 px-4 rounded-xl text-sm font-semibold bg-zinc-950 dark:bg-white text-white dark:text-zinc-950"
              >
                Get Started
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
};
