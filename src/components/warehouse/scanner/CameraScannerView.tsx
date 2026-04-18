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

    const qrbox = (w: number, h: number) => {
      const min = Math.min(w, h);
      const size = Math.floor(min * 0.7);
      return { width: size, height: size };
    };
    const onDecoded = (decodedText: string) => {
      if (cooldownRef.current) return;
      cooldownRef.current = true;
      onScan(decodedText);
      setTimeout(() => { cooldownRef.current = false; }, 1500);
    };

    // Pre-flight: is the MediaDevices API even available?
    // iOS Safari exposes `navigator.mediaDevices` only on secure origins (HTTPS
    // or localhost). A PWA running from the Home Screen in iOS <14 lacks it
    // entirely. Surface a clear message instead of a cryptic DOMException.
    if (typeof navigator === 'undefined' || !navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
      scannerRef.current = null;
      setIsStarting(false);
      setError(t('Camera API not available. Open this page in Safari (HTTPS) — not inside an app webview.'));
      return;
    }

    // Warm-up: call getUserMedia ourselves first. This has two benefits on iOS:
    //   1) The permission prompt appears within the synchronous user-gesture
    //      window of the preceding button click, which iOS Safari requires.
    //   2) We get a real DOMException name (NotAllowedError, NotFoundError,
    //      OverconstrainedError, NotReadableError) that we can classify.
    // We stop the warm-up stream immediately and hand off to html5-qrcode.
    const warmupAttempts: MediaStreamConstraints[] = [
      { video: { facingMode: { ideal: facingMode } }, audio: false },
      { video: { facingMode }, audio: false },
      { video: true, audio: false },
    ];
    let warmupErr: unknown = null;
    let warmupOk = false;
    for (const constraints of warmupAttempts) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        // Stop the preview stream — html5-qrcode will request its own.
        stream.getTracks().forEach((track) => track.stop());
        warmupOk = true;
        break;
      } catch (err) {
        warmupErr = err;
        // NotAllowedError is terminal — no point retrying with a different constraint.
        if (err instanceof DOMException && err.name === 'NotAllowedError') break;
      }
    }

    if (!warmupOk) {
      scannerRef.current = null;
      setIsStarting(false);
      const name = warmupErr instanceof DOMException ? warmupErr.name : '';
      const rawMsg = warmupErr instanceof Error ? warmupErr.message : String(warmupErr ?? '');
      console.error('[CameraScanner] warmup failed', name, rawMsg, warmupErr);
      if (name === 'NotAllowedError' || /permission|denied|notallowed/i.test(rawMsg)) {
        setError(t('Camera permission denied. Open Safari Settings → Websites → Camera → Allow.'));
      } else if (name === 'NotFoundError' || /notfound|no camera/i.test(rawMsg)) {
        setError(t('No camera found on this device.'));
      } else if (name === 'NotReadableError' || /notreadable|in use/i.test(rawMsg)) {
        setError(t('Camera is already in use by another app.'));
      } else if (name === 'OverconstrainedError' || name === 'ConstraintNotSatisfiedError') {
        setError(t('This device does not have a back camera that matches the request.'));
      } else if (name === 'SecurityError' || /secure context|https/i.test(rawMsg)) {
        setError(t('Camera API not available. Open this page in Safari (HTTPS) — not inside an app webview.'));
      } else {
        setError(`${name || 'Error'}: ${rawMsg || t('Camera not available')}`);
      }
      return;
    }

    // Warm-up succeeded → permission is granted and a matching camera exists.
    // Hand off to html5-qrcode for scanning.
    let lastErr: unknown = null;
    try {
      const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import('html5-qrcode');
      const scanner = new Html5Qrcode('scanner-container', {
        verbose: false,
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

      const attempts: MediaTrackConstraints[] = [
        { facingMode: { ideal: facingMode } },
        { facingMode },
        {},
      ];

      let started = false;
      for (const cameraConstraint of attempts) {
        try {
          await scanner.start(
            cameraConstraint,
            { fps: 15, qrbox, disableFlip: false },
            onDecoded,
            () => { /* ignore scan failures */ },
          );
          started = true;
          break;
        } catch (err) {
          lastErr = err;
        }
      }

      if (!started) throw lastErr ?? new Error('Failed to start camera');

      try {
        const caps = scanner.getRunningTrackCameraCapabilities();
        const torch = (caps as unknown as { torch?: () => { isSupported?: () => boolean } }).torch?.();
        setTorchSupported(Boolean(torch?.isSupported?.()));
      } catch {
        setTorchSupported(false);
      }
      setError(null);
    } catch (err) {
      scannerRef.current = null;
      const name = err instanceof DOMException ? err.name : '';
      const rawMsg = err instanceof Error ? err.message : String(err);
      console.error('[CameraScanner] start failed', name, rawMsg, err);
      setError(`${name || 'Error'}: ${rawMsg || t('Camera not available')}`);
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
        advanced: [{ torch: !torchOn }] as unknown as MediaTrackConstraintSet[],
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
