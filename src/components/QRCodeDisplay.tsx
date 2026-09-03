import React, { useEffect, useState, useRef } from 'react';
import QRCode from 'qrcode';
import { Download, Copy, Check, Printer } from 'lucide-react';

interface QRCodeDisplayProps {
  token: string;
  guestName?: string;
  eventName?: string;
  size?: number;
}

export const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({
  token,
  guestName,
  eventName,
  size = 220,
}) => {
  const [dataUrl, setDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Secure URL encoded in the QR code (Section 15: opaque token/URL, never plaintext email/password)
  const fullInviteUrl = `${window.location.origin}/invite/${token}`;

  useEffect(() => {
    if (!token) return;

    QRCode.toDataURL(fullInviteUrl, {
      width: size * 2, // High DPI
      margin: 2,
      color: {
        dark: '#09090b', // zinc-950
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    })
      .then((url) => {
        setDataUrl(url);
      })
      .catch((err) => {
        console.error('QR code generation error:', err);
      });
  }, [token, fullInviteUrl, size]);

  const downloadQR = () => {
    if (!dataUrl) return;
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `eventpass-${(guestName || 'invite').toLowerCase().replace(/\s+/g, '-')}-qr.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(fullInviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const printPass = () => {
    window.print();
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      {/* QR Code Container with subtle security border */}
      <div className="relative p-4 bg-white rounded-2xl shadow-sm border border-zinc-200/80 inline-block">
        {dataUrl ? (
          <img
            src={dataUrl}
            alt="Event Invitation QR Code"
            width={size}
            height={size}
            className="rounded-lg select-none"
          />
        ) : (
          <div
            style={{ width: size, height: size }}
            className="flex items-center justify-center bg-zinc-100 rounded-lg animate-pulse text-xs text-zinc-400 font-mono"
          >
            Generating QR...
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={copyLink}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition cursor-pointer"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? 'Link Copied' : 'Copy Link'}
        </button>

        <button
          onClick={downloadQR}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          Save Image
        </button>

        <button
          onClick={printPass}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition cursor-pointer"
        >
          <Printer className="w-3.5 h-3.5" />
          Print Pass
        </button>
      </div>
    </div>
  );
};
