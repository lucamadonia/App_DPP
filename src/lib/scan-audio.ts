/**
 * Scan Audio Feedback
 * Web Audio API synthesized sounds — no audio files needed
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (audioCtx) return audioCtx;
  try {
    audioCtx = new AudioContext();
    return audioCtx;
  } catch {
    return null;
  }
}

function playTone(frequency: number, duration: number, type: OscillatorType = 'sine', volume = 0.3) {
  const ctx = getAudioContext();
  if (!ctx) return;

  // Resume context if suspended (browser autoplay policy)
  if (ctx.state === 'suspended') ctx.resume();

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(frequency, ctx.currentTime);

  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + duration);
}

/** Short high-pitched beep — scan success */
export function playSuccessBeep() {
  playTone(880, 0.12, 'sine', 0.25);
  setTimeout(() => playTone(1320, 0.1, 'sine', 0.2), 100);
}

/** Low buzz double-pulse — scan error */
export function playErrorBeep() {
  playTone(220, 0.15, 'square', 0.2);
  setTimeout(() => playTone(220, 0.15, 'square', 0.2), 200);
}

/** Trigger haptic feedback if available */
export function triggerHaptic(pattern: number | number[] = 50) {
  if ('vibrate' in navigator) {
    navigator.vibrate(pattern);
  }
}
