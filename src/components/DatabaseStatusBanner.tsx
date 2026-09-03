import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { SystemStatus } from '../types';
import { Database, AlertTriangle, CheckCircle2, Copy, Check, RefreshCw, Server } from 'lucide-react';

export const DatabaseStatusBanner: React.FC = () => {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const res = await api.system.status();
      if (res.success && res.data) {
        setStatus(res.data);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleSeed = async () => {
    setSeeding(true);
    setSeedResult(null);
    try {
      const res = await api.system.seed();
      if (res.success) {
        setSeedResult('Database seeded successfully! Sample organizer, staff, and guests created.');
        fetchStatus();
      } else {
        setSeedResult(res.error?.message || 'Failed to seed database.');
      }
    } catch (err: any) {
      setSeedResult('Seed error: ' + err.message);
    } finally {
      setSeeding(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!status) return null;

  const isConnected = status.database.connected;

  return (
    <>
      {/* Top Banner if disconnected */}
      {!isConnected && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 text-xs md:text-sm text-amber-800 dark:text-amber-200">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
              <span>
                <strong>Database Not Connected:</strong> To store persistent events & attendance, check database status.
              </span>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="text-xs font-semibold underline hover:text-amber-950 dark:hover:text-amber-100 cursor-pointer shrink-0"
            >
              Setup Guide & Diagnostics →
            </button>
          </div>
        </div>
      )}

      {/* Pill in Navbar (or anywhere) */}
      <button
        onClick={() => setShowModal(true)}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition cursor-pointer border ${
          isConnected
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
            : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
        }`}
        title="Click to view database connection info & diagnostics"
      >
        <Database className={`w-3.5 h-3.5 ${isConnected ? 'text-emerald-600' : 'text-amber-600'}`} />
        <span>
          {isConnected
            ? status.database.type === 'sqlite'
              ? 'SQLite Connected'
              : 'MySQL Connected'
            : 'Database Offline'}
        </span>
      </button>

      {/* Diagnostics Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-5 text-zinc-800 dark:text-zinc-200">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-lg ${isConnected ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                  <Server className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base">Database Architecture & Status</h3>
                  <p className="text-xs text-zinc-500">
                    Prisma ORM ({status.database.type === 'sqlite' ? 'SQLite Engine - Zero Config' : 'MySQL Engine'})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-xl font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Status card */}
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/60">
                <div className="space-y-1">
                  <div className="text-xs font-semibold text-zinc-500">Connection State</div>
                  <div className="flex items-center gap-2">
                    {isConnected ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">Operational & Connected</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                        <span className="font-semibold text-amber-600 dark:text-amber-400">Database Offline / Awaiting Connection</span>
                      </>
                    )}
                  </div>
                </div>
                <button
                  onClick={fetchStatus}
                  disabled={loading}
                  className="p-2 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition cursor-pointer"
                  title="Test Connection"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>

              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/60 space-y-1.5">
                <div className="text-xs font-semibold text-zinc-500">DATABASE_URL Configuration</div>
                <div className="font-mono text-xs text-zinc-700 dark:text-zinc-300 break-all bg-zinc-200 dark:bg-zinc-950 p-2 rounded">
                  {status.database.maskedUrl}
                </div>
                {status.database.error && (
                  <p className="text-xs text-rose-500 font-mono pt-1">
                    Error: {status.database.error}
                  </p>
                )}
              </div>
            </div>

            {/* Connection instructions */}
            <div className="space-y-2 text-xs text-zinc-600 dark:text-zinc-400">
              <h4 className="font-semibold text-zinc-900 dark:text-zinc-100">Connecting MySQL:</h4>
              <p>
                EVENTPASS uses a strict MySQL database with Prisma migrations. Set your environment variable:
              </p>
              <div className="relative font-mono bg-zinc-900 text-zinc-200 p-2.5 rounded-lg">
                <code>DATABASE_URL="mysql://root:password@localhost:3306/eventpass"</code>
                <button
                  onClick={() => copyToClipboard('DATABASE_URL="mysql://root:password@localhost:3306/eventpass"')}
                  className="absolute right-2 top-2 p-1 text-zinc-400 hover:text-zinc-100 cursor-pointer"
                  title="Copy"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
              <p className="text-[11px] text-zinc-500">
                You can run a local MySQL container or use Cloud MySQL (PlanetScale, AWS RDS, GCP Cloud SQL, Aiven, etc.).
              </p>
            </div>

            {/* Seed Actions */}
            {isConnected && (
              <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800">
                <div className="flex items-center justify-between">
                  <div>
                    <h5 className="font-semibold text-xs">Development Seed Data</h5>
                    <p className="text-[11px] text-zinc-500">Seeds sample event, organizer, staff, and guests.</p>
                  </div>
                  <button
                    onClick={handleSeed}
                    disabled={seeding}
                    className="px-3 py-1.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg text-xs font-semibold hover:opacity-90 transition disabled:opacity-50 cursor-pointer"
                  >
                    {seeding ? 'Seeding...' : 'Seed Database'}
                  </button>
                </div>
                {seedResult && (
                  <p className="mt-2 text-xs font-mono text-emerald-600 dark:text-emerald-400">
                    {seedResult}
                  </p>
                )}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-xl text-xs font-medium cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
