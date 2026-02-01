import { useState, useRef, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const PRESET_COLORS = [
  '#3b82f6', '#2563eb', '#1d4ed8', '#60a5fa',
  '#22c55e', '#16a34a', '#ef4444', '#dc2626',
  '#f59e0b', '#d97706', '#8b5cf6', '#a855f7',
  '#ec4899', '#0f172a',
];

function hexToHsl(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return [h * 360, s, l];
}

function hslToHex(h: number, s: number, l: number): string {
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  if (s === 0) {
    const val = Math.round(l * 255);
    return `#${val.toString(16).padStart(2, '0')}${val.toString(16).padStart(2, '0')}${val.toString(16).padStart(2, '0')}`;
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const r = Math.round(hue2rgb(p, q, h / 360 + 1 / 3) * 255);
  const g = Math.round(hue2rgb(p, q, h / 360) * 255);
  const b = Math.round(hue2rgb(p, q, h / 360 - 1 / 3) * 255);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

interface ColorPickerFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

export function ColorPickerField({ label, value, onChange }: ColorPickerFieldProps) {
  const { t } = useTranslation('returns');
  const [hue, setHue] = useState(() => hexToHsl(value || '#3b82f6')[0]);
  const [hexInput, setHexInput] = useState(value || '#3b82f6');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDraggingCanvas = useRef(false);
  const isDraggingHue = useRef(false);

  useEffect(() => {
    setHexInput(value);
    const [h] = hexToHsl(value || '#3b82f6');
    setHue(h);
  }, [value]);

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width, h = canvas.height;

    // Saturation gradient (left to right)
    for (let x = 0; x < w; x++) {
      for (let y = 0; y < h; y++) {
        const s = x / w;
        const l = 1 - y / h;
        ctx.fillStyle = hslToHex(hue, s, l * 0.5 + (1 - s) * l * 0.5);
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }, [hue]);

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    const s = x;
    const l = (1 - y) * 0.5 + (1 - x) * (1 - y) * 0.5;
    const hex = hslToHex(hue, s, l);
    onChange(hex);
  }, [hue, onChange]);

  const handleCanvasMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    isDraggingCanvas.current = true;
    handleCanvasClick(e);
  }, [handleCanvasClick]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingCanvas.current && canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
        const s = x;
        const l = (1 - y) * 0.5 + (1 - x) * (1 - y) * 0.5;
        const hex = hslToHex(hue, s, l);
        onChange(hex);
      }
    };
    const handleMouseUp = () => {
      isDraggingCanvas.current = false;
      isDraggingHue.current = false;
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [hue, onChange]);

  const handleHueChange = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const newHue = x * 360;
    setHue(newHue);
    const [, s, l] = hexToHsl(value || '#3b82f6');
    const hex = hslToHex(newHue, s, l);
    onChange(hex);
  };

  const handleHexInputChange = (val: string) => {
    setHexInput(val);
    if (/^#[0-9a-fA-F]{6}$/.test(val)) {
      onChange(val);
    }
  };

  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-2 h-8 px-2 rounded-md border bg-background hover:bg-accent transition-colors w-full"
          >
            <div
              className="w-5 h-5 rounded border shadow-sm shrink-0"
              style={{ backgroundColor: value }}
            />
            <span className="text-xs font-mono text-muted-foreground">{value}</span>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-3 animate-picker-fade-in" align="start">
          {/* SV Canvas */}
          <canvas
            ref={canvasRef}
            width={232}
            height={140}
            className="w-full h-[140px] rounded cursor-crosshair border"
            onMouseDown={handleCanvasMouseDown}
          />

          {/* Hue slider */}
          <div
            className="mt-2 h-3 rounded cursor-pointer border"
            style={{
              background: 'linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)',
            }}
            onMouseDown={(e) => {
              isDraggingHue.current = true;
              handleHueChange(e);
            }}
            onMouseMove={(e) => {
              if (isDraggingHue.current) handleHueChange(e);
            }}
          />

          {/* Hex input + preview */}
          <div className="flex items-center gap-2 mt-2">
            <div
              className="w-8 h-8 rounded border shadow-sm shrink-0"
              style={{ backgroundColor: value }}
            />
            <Input
              value={hexInput}
              onChange={(e) => handleHexInputChange(e.target.value)}
              className="h-8 text-xs font-mono"
              maxLength={7}
            />
          </div>

          {/* Preset swatches */}
          <div className="mt-2">
            <p className="text-[10px] text-muted-foreground mb-1">{t('Preset Colors')}</p>
            <div className="grid grid-cols-7 gap-1">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={`w-6 h-6 rounded border transition-all hover:scale-110 ${
                    value === color ? 'ring-2 ring-primary ring-offset-1' : ''
                  }`}
                  style={{ backgroundColor: color }}
                  onClick={() => onChange(color)}
                />
              ))}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
