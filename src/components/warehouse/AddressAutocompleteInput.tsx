import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MapPin, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  autocompleteAddress,
  fetchPlaceDetails,
  isGoogleAddressEnabled,
  type AutocompleteSuggestion,
} from '@/services/supabase/address-validation';

interface Props {
  value: string;
  onChange: (street: string) => void;
  /** Country ISO-2 to bias suggestions. */
  countryHint?: string;
  /** Fired when the user picks a suggestion. Receives all four fields. */
  onAddressPicked?: (addr: {
    street: string;
    city: string;
    postalCode: string;
    country: string;
    formattedAddress: string;
  }) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
  label?: string;
}

/**
 * Google-Places-powered street input. Renders a debounced suggestion popover
 * underneath. Falls back to a plain Input when GOOGLE_MAPS_API_KEY isn't
 * configured on the server — caller doesn't need to branch.
 */
export function AddressAutocompleteInput({
  value,
  onChange,
  countryHint,
  onAddressPicked,
  placeholder,
  className = '',
  required,
  label,
}: Props) {
  const { t } = useTranslation('warehouse');
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [suggestions, setSuggestions] = useState<AutocompleteSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const sessionTokenRef = useRef<string>('');
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Detect capability once on mount.
  useEffect(() => {
    let cancelled = false;
    isGoogleAddressEnabled().then((e) => {
      if (!cancelled) setEnabled(e);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Create a session token per autocomplete flow (Google billing optimisation).
  const ensureSessionToken = () => {
    if (!sessionTokenRef.current) sessionTokenRef.current = crypto.randomUUID();
    return sessionTokenRef.current;
  };

  // Debounced suggestion fetch.
  useEffect(() => {
    if (!enabled) return;
    if (!value || value.trim().length < 3) {
      setSuggestions([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const id = setTimeout(async () => {
      const result = await autocompleteAddress({
        input: value,
        country: countryHint,
        sessionToken: ensureSessionToken(),
      });
      if (!cancelled) {
        setSuggestions(result);
        setLoading(false);
        setHighlighted(0);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(id);
      setLoading(false);
    };
  }, [value, countryHint, enabled]);

  // Close on outside click.
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const pick = async (s: AutocompleteSuggestion) => {
    setShowSuggestions(false);
    setSuggestions([]);
    const details = await fetchPlaceDetails({
      placeId: s.placeId,
      sessionToken: sessionTokenRef.current,
    });
    sessionTokenRef.current = ''; // Session ends with the selection.
    if (!details) {
      // Fallback: just use the main text as the street.
      onChange(s.mainText || s.text);
      return;
    }
    onChange(details.street || s.mainText);
    onAddressPicked?.({
      street: details.street,
      city: details.city,
      postalCode: details.postalCode,
      country: details.country,
      formattedAddress: details.formattedAddress,
    });
  };

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlighted((h) => Math.min(h + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlighted((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      void pick(suggestions[highlighted]);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  return (
    <div className="space-y-1.5" ref={wrapperRef}>
      {label && (
        <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
          {label} {required && <span className="text-rose-500">*</span>}
        </Label>
      )}
      <div className="relative">
        <Input
          ref={inputRef}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          onKeyDown={onKey}
          placeholder={placeholder}
          className={`${className} ${enabled ? 'pl-9' : ''}`}
          autoComplete="off"
        />
        {enabled && (
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-blue-500 pointer-events-none">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
          </span>
        )}
        {enabled && showSuggestions && suggestions.length > 0 && (
          <div className="absolute z-50 top-full mt-1 left-0 right-0 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl max-h-72 overflow-y-auto p-1.5">
            {suggestions.map((s, i) => (
              <button
                key={s.placeId}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  void pick(s);
                }}
                onMouseEnter={() => setHighlighted(i)}
                className={`w-full text-left px-3 py-2.5 text-sm rounded-lg transition-colors ${
                  i === highlighted
                    ? 'bg-blue-50 dark:bg-blue-950/40 text-slate-900 dark:text-white'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <div className="font-semibold truncate">{s.mainText}</div>
                {s.secondaryText && (
                  <div className="text-xs text-slate-500 truncate">{s.secondaryText}</div>
                )}
              </button>
            ))}
            <div className="px-3 py-1.5 text-[10px] text-slate-400 dark:text-slate-500 border-t border-slate-100 dark:border-slate-800 mt-1">
              {t('Powered by Google')}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
