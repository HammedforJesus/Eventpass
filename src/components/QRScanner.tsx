import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Camera, CameraOff, RefreshCw, AlertCircle } from 'lucide-react';

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

        await html5QrCode.start(
          { facingMode: 'environment' },
          config,
          (decodedText) => {
            const now = Date.now();
            // Throttle consecutive duplicate scans (1.5s debounce)
            if (decodedText === lastScannedText.current && now - lastScannedTime.current < 1500) {
              return;
            }
            lastScannedText.current = decodedText;
            lastScannedTime.current = now;
            onScanSuccess(decodedText);
          },
          (err) => {
            // benign frame decode failure
            if (onScanError) onScanError(err);
          }
        );

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
  }, [onScanSuccess]);

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
    <div className="relative w-full max-w-sm mx-auto overflow-hidden rounded-2xl bg-zinc-950 border border-zinc-800 shadow-xl">
      {/* Viewfinder Target Container */}
      <div id={containerId} className="w-full aspect-square" />

      {/* Laser Scanning Animation Overlay */}
      {isScanning && !isPaused && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="relative w-64 h-64 border-2 border-emerald-500/60 rounded-2xl">
            {/* Corner Markers */}
            <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-emerald-400 rounded-tl" />
            <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-emerald-400 rounded-tr" />
            <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-emerald-400 rounded-bl" />
            <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-emerald-400 rounded-br" />

            {/* Pulsing Scan Beam */}
            <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_12px_#34d399] animate-[bounce_2s_infinite]" />
          </div>
        </div>
      )}

      {/* Error or Camera Unavailable State */}
      {hasPermission === false && (
        <div className="absolute inset-0 bg-zinc-950 flex flex-col items-center justify-center p-6 text-center text-zinc-300 space-y-3">
          <div className="p-3 bg-zinc-900 rounded-full text-amber-400">
            <CameraOff className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h4 className="font-semibold text-white text-sm">Camera Unavailable</h4>
            <p className="text-xs text-zinc-400 max-w-xs">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Footer status text */}
      <div className="p-2.5 bg-zinc-900/90 text-center text-[11px] text-zinc-400 font-mono flex items-center justify-center gap-1.5 border-t border-zinc-800">
        <Camera className="w-3.5 h-3.5 text-emerald-400" />
        <span>Align QR code inside frame</span>
      </div>
    </div>
  );
};
