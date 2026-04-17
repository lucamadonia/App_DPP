import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Camera, CameraOff, SwitchCamera } from 'lucide-react';
import type { Html5Qrcode as Html5QrcodeType } from 'html5-qrcode';

interface CameraScannerViewProps {
  enabled: boolean;
  onScan: (decodedText: string) => void;
  onClose: () => void;
}

export function CameraScannerView({ enabled, onScan, onClose }: CameraScannerViewProps) {
  const { t } = useTranslation('warehouse');
  const containerRef = useRef<HTMLDivElement>(null);
  const scannerRef = useRef<Html5QrcodeType | null>(null);
  const cooldownRef = useRef(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [error, setError] = useState<string | null>(null);

  const startScanner = useCallback(async () => {
    if (!containerRef.current || scannerRef.current) return;

    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      const scanner = new Html5Qrcode('scanner-container');
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode },
        {
          fps: 10,
          qrbox: { width: 280, height: 280 },
          aspectRatio: 1,
        },
        (decodedText) => {
          if (cooldownRef.current) return;
          cooldownRef.current = true;
          onScan(decodedText);
          // Cooldown prevents duplicate reads
          setTimeout(() => { cooldownRef.current = false; }, 2000);
        },
        () => { /* ignore scan failures */ },
      );
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Camera not available');
    }
  }, [facingMode, onScan]);

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
      } catch { /* already stopped */ }
      scannerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (enabled) {
      startScanner();
    }
    return () => { stopScanner(); };
  }, [enabled, startScanner, stopScanner]);

  const toggleCamera = useCallback(async () => {
    await stopScanner();
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
  }, [stopScanner]);

  if (!enabled) return null;

  return (
    <div className="relative rounded-2xl overflow-hidden bg-black border border-white/10">
      {/* Camera viewfinder */}
      <div className="relative aspect-square max-h-[400px] mx-auto">
        <div id="scanner-container" ref={containerRef} className="w-full h-full" />

        {/* Scan line animation */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute left-[10%] right-[10%] top-[10%] bottom-[10%] border-2 border-emerald-500/40 rounded-xl">
            {/* Animated scan line */}
            <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent animate-scan-line" />
            {/* Corner markers */}
            <div className="absolute -top-0.5 -left-0.5 w-6 h-6 border-t-2 border-l-2 border-emerald-400 rounded-tl-lg" />
            <div className="absolute -top-0.5 -right-0.5 w-6 h-6 border-t-2 border-r-2 border-emerald-400 rounded-tr-lg" />
            <div className="absolute -bottom-0.5 -left-0.5 w-6 h-6 border-b-2 border-l-2 border-emerald-400 rounded-bl-lg" />
            <div className="absolute -bottom-0.5 -right-0.5 w-6 h-6 border-b-2 border-r-2 border-emerald-400 rounded-br-lg" />
          </div>
        </div>

        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/90">
            <CameraOff className="h-12 w-12 text-red-400 mb-3" />
            <p className="text-sm text-red-400 text-center px-4">{error}</p>
          </div>
        )}
      </div>

      {/* Camera controls */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-900/80">
        <button
          type="button"
          onClick={toggleCamera}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
        >
          <SwitchCamera className="h-4 w-4" />
          {t('Flip')}
        </button>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Camera className="h-3.5 w-3.5" />
          <span className="animate-pulse">{t('Scanning')}...</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="px-3 py-2 rounded-xl text-xs text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
        >
          {t('Close')}
        </button>
      </div>
    </div>
  );
}
