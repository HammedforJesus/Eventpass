import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { api } from '../api/client';
import { EventItem } from '../types';
import { QRScanner } from '../components/QRScanner';
import {
  ShieldCheck,
  QrCode,
  KeyRound,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Users,
  Clock,
  Volume2,
  VolumeX,
  Sparkles,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';

export const CheckInInterface: React.FC = () => {
  const { id: routeEventId } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { joinEvent, leaveEvent, onCheckIn } = useSocket();

  const [events, setEvents] = useState<EventItem[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>(routeEventId || '');
  const [currentEvent, setCurrentEvent] = useState<EventItem | null>(null);

  // Scan & input states
  const [activeMode, setActiveMode] = useState<'camera' | 'pin'>('camera');
  const [manualCode, setManualCode] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Result state
  const [verificationResult, setVerificationResult] = useState<{
    status: 'SUCCESS' | 'ALREADY_CHECKED_IN' | 'ERROR';
    title: string;
    message: string;
    guest?: {
      name: string;
      category: string;
      plusOne?: number;
      checkedInAt?: string;
    };
    checkedInBy?: string;
  } | null>(null);

  // Real-time metrics
  const [liveStats, setLiveStats] = useState<{
    checkedIn: number;
    capacity: number;
    totalInvited: number;
    remaining: number;
  }>({
    checkedIn: 0,
    capacity: 0,
    totalInvited: 0,
    remaining: 0,
  });

  const [recentScans, setRecentScans] = useState<any[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const autoResetTimer = useRef<any>(null);

  // Simple Audio Synthesizer for Audio Feedback (Success chime / Error buzz)
  const playFeedbackSound = (type: 'success' | 'error' | 'warning') => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      if (type === 'success') {
        // High pitched pleasant chord
        osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
        osc.frequency.setValueAtTime(880.0, audioCtx.currentTime + 0.1); // A5
        gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.35);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.35);
      } else {
        // Low dual buzz
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(160, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.4);
      }
    } catch {
      // ignore
    }
  };

  // Load events
  useEffect(() => {
    api.events.list().then((res) => {
      if (res.success && res.data) {
        setEvents(res.data);
        if (!selectedEventId && res.data.length > 0) {
          setSelectedEventId(res.data[0].id);
        }
      }
    });
  }, []);

  // Update current event and metrics
  useEffect(() => {
    if (!selectedEventId) return;

    api.events.get(selectedEventId).then((res) => {
      if (res.success && res.data) {
        setCurrentEvent(res.data);
        const checked = res.data._count?.checkIns || 0;
        const cap = res.data.capacity;
        const total = res.data._count?.guests || 0;
        setLiveStats({
          checkedIn: checked,
          capacity: cap,
          totalInvited: total,
          remaining: Math.max(0, cap - checked),
        });
      }
    });

    joinEvent(selectedEventId);

    const cleanup = onCheckIn((data) => {
      setRecentScans((prev) => [data, ...prev.slice(0, 19)]);
      if (data.stats) {
        setLiveStats((s) => ({
          ...s,
          checkedIn: data.stats.checkedIn,
          remaining: data.stats.remaining,
        }));
      }
    });

    return () => {
      leaveEvent(selectedEventId);
      cleanup();
    };
  }, [selectedEventId]);

  // Clean auto-reset timer on unmount
  useEffect(() => {
    return () => {
      if (autoResetTimer.current) clearTimeout(autoResetTimer.current);
    };
  }, []);

  const resetVerification = () => {
    if (autoResetTimer.current) clearTimeout(autoResetTimer.current);
    setVerificationResult(null);
    setManualCode('');
    setIsProcessing(false);
  };

  // Schedule auto-reset after successful scan
  const scheduleAutoReset = () => {
    if (autoResetTimer.current) clearTimeout(autoResetTimer.current);
    autoResetTimer.current = setTimeout(() => {
      resetVerification();
    }, 4500);
  };

  // Process QR Token Scan
  const handleQRScan = async (scannedText: string) => {
    if (isProcessing || verificationResult) return;
    setIsProcessing(true);

    try {
      const res = await api.checkin.qr(selectedEventId, scannedText);

      if (res.success && res.data) {
        playFeedbackSound('success');
        setVerificationResult({
          status: 'SUCCESS',
          title: 'CHECK-IN SUCCESSFUL',
          message: 'Guest pass verified. Access granted.',
          guest: res.data.guest,
          checkedInBy: res.data.checkIn.checkedInBy,
        });
        if (res.data.stats) {
          setLiveStats((s) => ({
            ...s,
            checkedIn: res.data.stats.checkedIn,
            remaining: res.data.stats.remaining,
          }));
        }
        scheduleAutoReset();
      } else {
        if (res.error?.code === 'ALREADY_CHECKED_IN') {
          playFeedbackSound('error');
          setVerificationResult({
            status: 'ALREADY_CHECKED_IN',
            title: 'ALREADY CHECKED IN',
            message: res.error.message,
            guest: res.error.guest,
          });
        } else {
          playFeedbackSound('error');
          setVerificationResult({
            status: 'ERROR',
            title: 'VERIFICATION FAILED',
            message: res.error?.message || 'Invalid or revoked QR code.',
          });
        }
      }
    } catch (err: any) {
      playFeedbackSound('error');
      setVerificationResult({
        status: 'ERROR',
        title: 'VERIFICATION FAILED',
        message: err.message || 'Network error.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Process 6-Digit Code
  const handleCodeSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isProcessing || manualCode.trim().length !== 6) return;
    setIsProcessing(true);

    try {
      const res = await api.checkin.code(selectedEventId, manualCode.trim());

      if (res.success && res.data) {
        playFeedbackSound('success');
        setVerificationResult({
          status: 'SUCCESS',
          title: 'CHECK-IN SUCCESSFUL',
          message: '6-digit code verified. Access granted.',
          guest: res.data.guest,
          checkedInBy: res.data.checkIn.checkedInBy,
        });
        if (res.data.stats) {
          setLiveStats((s) => ({
            ...s,
            checkedIn: res.data.stats.checkedIn,
            remaining: res.data.stats.remaining,
          }));
        }
        scheduleAutoReset();
      } else {
        if (res.error?.code === 'ALREADY_CHECKED_IN') {
          playFeedbackSound('error');
          setVerificationResult({
            status: 'ALREADY_CHECKED_IN',
            title: 'ALREADY CHECKED IN',
            message: res.error.message,
            guest: res.error.guest,
          });
        } else {
          playFeedbackSound('error');
          setVerificationResult({
            status: 'ERROR',
            title: 'VERIFICATION FAILED',
            message: res.error?.message || 'Invalid 6-digit verification code.',
          });
        }
      }
    } catch (err: any) {
      playFeedbackSound('error');
      setVerificationResult({
        status: 'ERROR',
        title: 'VERIFICATION FAILED',
        message: err.message || 'Verification error.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePinKey = (char: string) => {
    if (manualCode.length < 6) {
      const next = manualCode + char;
      setManualCode(next);
      if (next.length === 6) {
        // Auto submit on 6 digits
        setTimeout(() => {
          api.checkin.code(selectedEventId, next).then((res) => {
            if (res.success && res.data) {
              playFeedbackSound('success');
              setVerificationResult({
                status: 'SUCCESS',
                title: 'CHECK-IN SUCCESSFUL',
                message: '6-digit code verified.',
                guest: res.data.guest,
                checkedInBy: res.data.checkIn.checkedInBy,
              });
              scheduleAutoReset();
            } else {
              playFeedbackSound('error');
              setVerificationResult({
                status: res.error?.code === 'ALREADY_CHECKED_IN' ? 'ALREADY_CHECKED_IN' : 'ERROR',
                title: res.error?.code === 'ALREADY_CHECKED_IN' ? 'ALREADY CHECKED IN' : 'VERIFICATION FAILED',
                message: res.error?.message || 'Invalid PIN.',
                guest: res.error?.guest,
              });
            }
          });
        }, 150);
      }
    }
  };

  const handlePinBackspace = () => {
    setManualCode(manualCode.slice(0, -1));
  };

  return (
    <div className="min-h-[90vh] bg-zinc-950 text-white selection:bg-emerald-500 selection:text-black">
      {/* Top Bar with Event Selector and Sound Toggle */}
      <div className="border-b border-zinc-800 bg-zinc-900/60 backdrop-blur px-4 sm:px-6 py-3">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              to={currentEvent ? `/events/${currentEvent.id}` : '/dashboard'}
              className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition"
              title="Return"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>

            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <span className="font-bold text-sm tracking-tight hidden sm:inline">EVENTPASS Gate</span>
            </div>

            {/* Event Selector */}
            <select
              value={selectedEventId}
              onChange={(e) => {
                setSelectedEventId(e.target.value);
                resetVerification();
              }}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-zinc-800 border border-zinc-700 text-white focus:outline-none"
            >
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.name} ({ev.venue})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-2 rounded-lg bg-zinc-800 text-zinc-300 hover:text-white transition cursor-pointer"
              title={soundEnabled ? 'Audio Chime Enabled' : 'Audio Chime Muted'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-zinc-500" />}
            </button>

            <div className="text-right text-xs">
              <div className="font-mono text-emerald-400 font-bold">
                {liveStats.checkedIn} / {liveStats.capacity}
              </div>
              <div className="text-[10px] text-zinc-400">{liveStats.remaining} remaining</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Verification Stage */}
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Verification Result Banner (Section 25) */}
        {verificationResult ? (
          <div
            className={`p-6 sm:p-8 rounded-3xl border shadow-2xl space-y-6 text-center animate-scale-up ${
              verificationResult.status === 'SUCCESS'
                ? 'bg-emerald-950/90 border-emerald-500/80 text-emerald-100'
                : verificationResult.status === 'ALREADY_CHECKED_IN'
                ? 'bg-amber-950/90 border-amber-500/80 text-amber-100'
                : 'bg-rose-950/90 border-rose-500/80 text-rose-100'
            }`}
          >
            <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center font-black text-3xl shadow-lg">
              {verificationResult.status === 'SUCCESS' ? (
                <div className="w-16 h-16 rounded-full bg-emerald-500 text-zinc-950 flex items-center justify-center">
                  ✓
                </div>
              ) : verificationResult.status === 'ALREADY_CHECKED_IN' ? (
                <div className="w-16 h-16 rounded-full bg-amber-500 text-zinc-950 flex items-center justify-center">
                  !
                </div>
              ) : (
                <div className="w-16 h-16 rounded-full bg-rose-500 text-zinc-950 flex items-center justify-center">
                  ✕
                </div>
              )}
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight uppercase">
                {verificationResult.title}
              </h2>
              <p className="text-sm font-medium opacity-90 max-w-md mx-auto">
                {verificationResult.message}
              </p>
            </div>

            {/* Guest Identity Card */}
            {verificationResult.guest && (
              <div className="bg-black/40 rounded-2xl p-4 max-w-sm mx-auto border border-white/10 space-y-2 text-left">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-400 font-medium">Guest Name</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-white/20">
                    {verificationResult.guest.category}
                  </span>
                </div>
                <div className="text-lg font-bold text-white">{verificationResult.guest.name}</div>
                {verificationResult.guest.plusOne !== undefined && verificationResult.guest.plusOne > 0 && (
                  <div className="text-xs text-emerald-300">
                    + {verificationResult.guest.plusOne} Additional Guest Allowed
                  </div>
                )}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex justify-center gap-3 pt-2">
              <button
                onClick={resetVerification}
                className="px-6 py-3 rounded-xl bg-white text-zinc-950 font-bold text-sm hover:opacity-90 transition shadow-md flex items-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Next Scan (or Auto-Reset)</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Mode Selector Tabs */}
            <div className="flex justify-center">
              <div className="bg-zinc-900 p-1 rounded-2xl border border-zinc-800 flex gap-1">
                <button
                  onClick={() => setActiveMode('camera')}
                  className={`px-5 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                    activeMode === 'camera'
                      ? 'bg-zinc-800 text-white shadow-sm'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <QrCode className="w-4 h-4 text-emerald-400" />
                  Camera QR Scanner
                </button>
                <button
                  onClick={() => setActiveMode('pin')}
                  className={`px-5 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                    activeMode === 'pin'
                      ? 'bg-zinc-800 text-white shadow-sm'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <KeyRound className="w-4 h-4 text-indigo-400" />
                  6-Digit PIN Entry
                </button>
              </div>
            </div>

            {/* Camera QR Scanner View */}
            {activeMode === 'camera' && (
              <div className="space-y-4">
                <QRScanner
                  onScanSuccess={handleQRScan}
                  isPaused={isProcessing || Boolean(verificationResult)}
                />
                <div className="text-center">
                  <button
                    onClick={() => setActiveMode('pin')}
                    className="text-xs text-zinc-400 hover:text-white underline cursor-pointer"
                  >
                    Camera not working or guest has no QR? Enter 6-digit PIN →
                  </button>
                </div>
              </div>
            )}

            {/* 6-Digit PIN Pad View (Section 22) */}
            {activeMode === 'pin' && (
              <div className="max-w-sm mx-auto bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl space-y-6">
                <div className="text-center space-y-1">
                  <h3 className="font-bold text-base">Enter 6-Digit Verification PIN</h3>
                  <p className="text-xs text-zinc-400">Located below the QR code on the guest pass.</p>
                </div>

                {/* 6 PIN Boxes */}
                <div className="flex justify-center gap-2">
                  {[0, 1, 2, 3, 4, 5].map((idx) => (
                    <div
                      key={idx}
                      className={`w-11 h-13 rounded-xl border flex items-center justify-center font-mono font-bold text-xl transition ${
                        manualCode[idx]
                          ? 'border-emerald-500 bg-emerald-950/40 text-emerald-300'
                          : 'border-zinc-700 bg-zinc-950 text-zinc-500'
                      }`}
                    >
                      {manualCode[idx] || '•'}
                    </div>
                  ))}
                </div>

                {/* Numeric Keypad */}
                <div className="grid grid-cols-3 gap-2 pt-2">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                    <button
                      key={digit}
                      type="button"
                      onClick={() => handlePinKey(digit)}
                      className="py-3.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 font-bold text-lg transition active:scale-95 cursor-pointer"
                    >
                      {digit}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={resetVerification}
                    className="py-3.5 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-xs font-semibold text-zinc-400 hover:text-white transition cursor-pointer"
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePinKey('0')}
                    className="py-3.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 font-bold text-lg transition active:scale-95 cursor-pointer"
                  >
                    0
                  </button>
                  <button
                    type="button"
                    onClick={handlePinBackspace}
                    className="py-3.5 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-xs font-semibold text-zinc-400 hover:text-white transition cursor-pointer"
                  >
                    ⌫
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Live Activity Feed at Entrance */}
        <div className="pt-6 border-t border-zinc-900 space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold text-zinc-400">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" /> Recent Gate Entries
            </span>
            <span className="text-[11px] font-mono text-zinc-500">Live Sync</span>
          </div>

          <div className="space-y-2">
            {recentScans.length === 0 ? (
              <div className="p-4 rounded-xl bg-zinc-900/40 text-center text-xs text-zinc-500 font-mono">
                Scans will appear in this stream as they occur.
              </div>
            ) : (
              recentScans.map((scan, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-zinc-900/70 border border-zinc-800/80 flex items-center justify-between text-xs animate-fade-in"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span className="font-semibold text-white">{scan.guestName}</span>
                    <span className="px-1.5 py-0.2 rounded text-[10px] uppercase bg-zinc-800 text-zinc-300">
                      {scan.category}
                    </span>
                  </div>
                  <span className="text-zinc-500 font-mono text-[11px]">
                    {new Date(scan.checkedInAt).toLocaleTimeString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
