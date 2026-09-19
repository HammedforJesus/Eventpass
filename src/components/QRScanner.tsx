import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Camera, CameraOff, ScanLine } from 'lucide-react';

interface QRScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onScanError?: (errorMessage: string) => void;
  isPaused?: boolean;
}

export const QRScanner: React.FC<QRScannerProps> = ({
  onScanSuccess,
  onScanError,
  isPaused = false,
}) => {
  const [isScanning, setIsScanning] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerId = 'eventpass-qr-reader';
  const lastScannedText = useRef<string | null>(null);
  const lastScannedTime = useRef<number>(0);
  const onScanSuccessRef = useRef(onScanSuccess);
  const requiresClearFrame = useRef(false);

  onScanSuccessRef.current = onScanSuccess;

  useEffect(() => {
    let mounted = true;

    async function startScanner() {
      try {
        setErrorMessage(null);
        // Create scanner instance
        const html5QrCode = new Html5Qrcode(containerId, {
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
          verbose: false,
        });
        scannerRef.current = html5QrCode;

        // Try to obtain environment (back) camera
        const config = {
          fps: 15,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        };

        // Scan frame handlers
        const onFrameSuccess = (decodedText: string) => {
          const now = Date.now();
          if (requiresClearFrame.current) return;
          // Throttle consecutive duplicate scans (1.5s debounce)
          if (decodedText === lastScannedText.current && now - lastScannedTime.current < 1500) {
            return;
          }
          lastScannedText.current = decodedText;
          lastScannedTime.current = now;
          requiresClearFrame.current = true;
          onScanSuccessRef.current(decodedText);
        };

        const onFrameError = (err: any) => {
          // benign frame decode failure
          requiresClearFrame.current = false;
          if (onScanError) onScanError(err);
        };

        // Try environment camera (mobile back camera), fallback to user camera (laptop/webcam)
        try {
          await html5QrCode.start(
            { facingMode: 'environment' },
            config,
            onFrameSuccess,
            onFrameError
          );
        } catch (envErr) {
          console.log('[QRScanner] Back camera unavailable, falling back to front/user camera...');
          await html5QrCode.start(
            { facingMode: 'user' },
            config,
            onFrameSuccess,
            onFrameError
          );
        }

        if (mounted) {
          setIsScanning(true);
          setHasPermission(true);
        }
      } catch (err: any) {
        console.warn('Camera start error:', err);
        if (mounted) {
          setHasPermission(false);
          setIsScanning(false);
          setErrorMessage(
            err?.message ||
              'Camera access was denied or no camera device was found. You can verify guests using their 6-digit code below.'
          );
        }
      }
    }

    startScanner();

    return () => {
      mounted = false;
      if (scannerRef.current) {
        try {
          if (scannerRef.current.isScanning) {
            scannerRef.current.stop().then(() => {
              scannerRef.current?.clear();
            }).catch(() => {
              // ignore
            });
          }
        } catch {
          // ignore
        }
      }
    };
  }, []);

  // Handle pause/resume
  useEffect(() => {
    if (!scannerRef.current) return;
    try {
      if (isPaused && scannerRef.current.isScanning) {
        scannerRef.current.pause();
      } else if (!isPaused && scannerRef.current.isScanning) {
        scannerRef.current.resume();
      }
    } catch {
      // ignore
    }
  }, [isPaused]);

  return (
    <div className="relative w-full max-w-md mx-auto overflow-hidden rounded-3xl bg-zinc-950 border border-zinc-800 shadow-2xl">
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-900">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
            <ScanLine className="h-4 w-4" />
          </div>
          <div>
            <p className="text-xs font-bold text-white">Scan guest QR code</p>
            <p className="text-[10px] text-zinc-500">Keep the pass inside the frame</p>
          </div>
        </div>
        <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${
          isScanning ? 'bg-emerald-500/10 text-emerald-400' : 'bg-zinc-800 text-zinc-500'
        }`}>
          {isScanning ? 'Ready' : 'Starting'}
        </span>
      </div>

      {/* Viewfinder Target Container */}
      <div className="relative aspect-square bg-zinc-950">
        <div id={containerId} className="h-full w-full" />

        {/* Laser Scanning Animation Overlay */}
        {isScanning && !isPaused && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="relative h-[min(72vw,16rem)] w-[min(72vw,16rem)] max-h-[75%] max-w-[75%] rounded-2xl border-2 border-emerald-500/60">
            {/* Corner Markers */}
              <div className="absolute -left-1 -top-1 h-7 w-7 rounded-tl border-l-4 border-t-4 border-emerald-400" />
              <div className="absolute -right-1 -top-1 h-7 w-7 rounded-tr border-r-4 border-t-4 border-emerald-400" />
              <div className="absolute -bottom-1 -left-1 h-7 w-7 rounded-bl border-b-4 border-l-4 border-emerald-400" />
              <div className="absolute -bottom-1 -right-1 h-7 w-7 rounded-br border-b-4 border-r-4 border-emerald-400" />

              {/* Pulsing Scan Beam */}
              <div className="absolute left-2 right-2 top-1/2 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_12px_#34d399] animate-[pulse_2s_infinite]" />
            </div>
          </div>
        )}

        {/* Error or Camera Unavailable State */}
        {hasPermission === false && (
          <div className="absolute inset-0 flex flex-col items-center justify-center space-y-3 bg-zinc-950 p-6 text-center text-zinc-300">
            <div className="rounded-2xl bg-zinc-900 p-3 text-amber-400">
              <CameraOff className="h-8 w-8" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-white">Camera unavailable</h4>
              <p className="max-w-xs text-xs text-zinc-400">{errorMessage}</p>
            </div>
          </div>
        )}
      </div>

      {/* Footer status text */}
      <div className="flex items-center justify-center gap-2 border-t border-zinc-800 bg-zinc-900 px-3 py-3 text-center text-[11px] text-zinc-400">
        <Camera className="h-3.5 w-3.5 text-emerald-400" />
        <span>{isPaused ? 'Scanner paused while verifying' : 'Align all four corners inside the frame'}</span>
      </div>
    </div>
  );
};
