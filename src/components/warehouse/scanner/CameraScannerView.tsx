import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Camera, CameraOff, SwitchCamera, Zap, ZapOff, RefreshCw } from 'lucide-react';
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
  const [isStarting, setIsStarting] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);

  const startScanner = useCallback(async () => {
    if (!containerRef.current || scannerRef.current || isStarting) return;

    setIsStarting(true);
    setError(null);

    try {
      const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import('html5-qrcode');
      const scanner = new Html5Qrcode('scanner-container', {
        verbose: false,
        // Explicit format list — improves 1D barcode (EAN-13) detection speed
        formatsToSupport: [
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.DATA_MATRIX,
          Html5QrcodeSupportedFormats.ITF,
        ],
      });
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: { exact: facingMode } },
        {
          fps: 15,
          // Responsive viewfinder — sized to 70% of shortest edge
          qrbox: (w, h) => {
            const min = Math.min(w, h);
            const size = Math.floor(min * 0.7);
            return { width: size, height: size };
          },
          // Let html5-qrcode choose best aspect ratio for the device
          disableFlip: false,
        },
        (decodedText) => {
          if (cooldownRef.current) return;
          cooldownRef.current = true;
          onScan(decodedText);
          setTimeout(() => { cooldownRef.current = false; }, 1500);
        },
        () => { /* ignore scan failures */ },
      );

      // Detect torch capability (MediaTrackCapabilities.torch)
      try {
        const caps = scanner.getRunningTrackCameraCapabilities();
        const torch = (caps as unknown as { torch?: () => { isSupported?: () => boolean } }).torch?.();
        setTorchSupported(Boolean(torch?.isSupported?.()));
      } catch {
        setTorchSupported(false);
      }
      setError(null);
    } catch (err) {
      // Retry without `exact` — some browsers reject the exact constraint
      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        if (!scannerRef.current) {
          const fallback = new Html5Qrcode('scanner-container');
          scannerRef.current = fallback;
          await fallback.start(
            { facingMode },
            {
              fps: 15,
              qrbox: (w, h) => {
                const min = Math.min(w, h);
                const size = Math.floor(min * 0.7);
                return { width: size, height: size };
              },
            },
            (decodedText) => {
              if (cooldownRef.current) return;
              cooldownRef.current = true;
              onScan(decodedText);
              setTimeout(() => { cooldownRef.current = false; }, 1500);
            },
            () => { /* ignore */ },
          );
          setError(null);
          return;
        }
      } catch {
        // Fall through to error display
      }
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.toLowerCase().includes('permission') || msg.toLowerCase().includes('denied')) {
        setError(t('Camera permission denied. Please allow camera access in your browser settings.'));
      } else if (msg.toLowerCase().includes('notfound') || msg.toLowerCase().includes('not found')) {
        setError(t('No camera found on this device.'));
      } else {
        setError(msg || t('Camera not available'));
      }
    } finally {
      setIsStarting(false);
    }
  }, [facingMode, onScan, t, isStarting]);

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch { /* already stopped */ }
      scannerRef.current = null;
    }
    setTorchOn(false);
    setTorchSupported(false);
  }, []);

  useEffect(() => {
    if (enabled) {
      startScanner();
    }
    return () => { stopScanner(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, facingMode]);

  const toggleCamera = useCallback(async () => {
    await stopScanner();
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  }, [stopScanner]);

  const toggleTorch = useCallback(async () => {
    if (!scannerRef.current || !torchSupported) return;
    try {
      await scannerRef.current.applyVideoConstraints({
        advanced: [{ torch: !torchOn }] as MediaTrackConstraintSet[],
      });
      setTorchOn((prev) => !prev);
    } catch {
      setTorchSupported(false);
    }
  }, [torchOn, torchSupported]);

  const retry = useCallback(async () => {
    await stopScanner();
    setError(null);
    startScanner();
  }, [stopScanner, startScanner]);

  if (!enabled) return null;

  return (
    <div className="relative rounded-2xl overflow-hidden bg-black border border-white/10">
      {/* Camera viewfinder — responsive aspect, capped height */}
      <div className="relative w-full aspect-[4/3] sm:aspect-square max-h-[500px] mx-auto">
        <div id="scanner-container" ref={containerRef} className="w-full h-full [&>video]:!w-full [&>video]:!h-full [&>video]:!object-cover" />

        {/* Scan frame overlay */}
        {!error && !isStarting && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute left-[12%] right-[12%] top-[12%] bottom-[12%] rounded-xl">
              {/* Animated scan line */}
              <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent animate-scan-line shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
              {/* Corner markers */}
              <div className="absolute -top-0.5 -left-0.5 w-7 h-7 border-t-[3px] border-l-[3px] border-emerald-400 rounded-tl-lg" />
              <div className="absolute -top-0.5 -right-0.5 w-7 h-7 border-t-[3px] border-r-[3px] border-emerald-400 rounded-tr-lg" />
              <div className="absolute -bottom-0.5 -left-0.5 w-7 h-7 border-b-[3px] border-l-[3px] border-emerald-400 rounded-bl-lg" />
              <div className="absolute -bottom-0.5 -right-0.5 w-7 h-7 border-b-[3px] border-r-[3px] border-emerald-400 rounded-br-lg" />
            </div>
            {/* Subtle vignette */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(0,0,0,0.5)_100%)]" />
          </div>
        )}

        {/* Starting state */}
        {isStarting && !error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/90">
            <div className="h-12 w-12 rounded-full border-2 border-emerald-500/30 border-t-emerald-500 animate-spin mb-3" />
            <p className="text-sm text-slate-300">{t('Starting camera')}...</p>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/95 px-6 text-center">
            <div className="h-14 w-14 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center mb-3">
              <CameraOff className="h-7 w-7 text-red-400" />
            </div>
            <p className="text-sm text-red-300 font-medium mb-4 max-w-xs">{error}</p>
            <button
              type="button"
              onClick={retry}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-sm text-white transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              {t('Retry')}
            </button>
          </div>
        )}
      </div>

      {/* Camera controls */}
      <div className="flex items-center justify-between px-3 py-2.5 bg-slate-900/90 border-t border-white/5 gap-2">
        <button
          type="button"
          onClick={toggleCamera}
          disabled={isStarting || Boolean(error)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <SwitchCamera className="h-4 w-4" />
          <span className="hidden xs:inline">{t('Flip')}</span>
        </button>

        <div className="flex items-center gap-1.5 text-xs text-slate-400 min-w-0">
          {!error && !isStarting && (
            <>
              <span className="relative inline-flex h-1.5 w-1.5">
                <span className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
              </span>
              <span className="truncate">{t('Scanning')}...</span>
            </>
          )}
          {isStarting && <span className="truncate">{t('Starting camera')}...</span>}
          {error && <span className="text-red-400 truncate">{t('Error')}</span>}
        </div>

        <div className="flex items-center gap-1">
          {torchSupported && !error && (
            <button
              type="button"
              onClick={toggleTorch}
              className={`flex items-center justify-center h-8 w-8 rounded-lg transition-colors ${
                torchOn
                  ? 'bg-amber-500/20 text-amber-400'
                  : 'text-slate-400 hover:text-white hover:bg-white/10'
              }`}
              aria-label={torchOn ? t('Turn off flash') : t('Turn on flash')}
            >
              {torchOn ? <Zap className="h-4 w-4" /> : <ZapOff className="h-4 w-4" />}
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="px-2.5 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            {t('Close')}
          </button>
        </div>
      </div>

      {/* Format hint — only show initially */}
      {!error && !isStarting && (
        <div className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-slate-950/80 text-[10px] font-mono uppercase tracking-wider text-slate-500 border-t border-white/5">
          <Camera className="h-3 w-3" />
          <span>EAN-13 · QR · GS1 · Code 128 · DataMatrix</span>
        </div>
      )}
    </div>
  );
}
