import { useState, useEffect, useCallback, useRef, type CSSProperties } from 'react';
import { useParams, useSearchParams, useLocation } from 'react-router-dom';
import {
  Leaf,
  Shield,
  Recycle,
  Award,
  ChevronRight,
  X,
  ExternalLink,
  Layers,
  Globe,
  Languages,
  Loader2,
  Package,
  Zap,
  Wrench,
  Clock,
  BarChart3,
  ArrowUpRight,
  CalendarDays,
  Scale,
  Hash,
  AlertTriangle,
  FileText,
  Download,
  BookOpen,
  Video,
  HelpCircle,
  ShieldCheck,
  Lock,
  KeyRound,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Translations
// ---------------------------------------------------------------------------
const T: Record<string, Record<string, string>> = {
  en: {
    loading: 'Loading products\u2026',
    error: 'Could not load product data.',
    retry: 'Retry',
    noProducts: 'No products published yet.',
    productTransparency: 'Product Transparency',
    subtitle: 'Full supply chain & sustainability data for every product',
    materials: 'Materials',
    certifications: 'Certifications',
    carbonFootprint: 'Carbon Footprint',
    recyclability: 'Recyclability',
    sustainability: 'Sustainability',
    batches: 'Batches',
    viewDPP: 'View Full DPP',
    viewBatchDPP: 'View DPP',
    recycledContent: 'Recycled Content',
    durability: 'Durability',
    repairability: 'Repairability',
    energyUse: 'Energy',
    origin: 'Origin',
    ceMarked: 'CE Marked',
    batchNumber: 'Batch',
    produced: 'Produced',
    expires: 'Expires',
    quantity: 'Quantity',
    weight: 'Weight',
    dimensions: 'Dimensions',
    differsFromBase: 'Differs from base product',
    years: 'years',
    kwhPerYear: 'kWh/yr',
    kgCO2: 'kg CO\u2082',
    overrides: 'Changed',
    noOverrides: 'Same as base',
    poweredBy: 'Powered by Trackbliss',
    documents: 'Documents & Certificates',
    support: 'Support & Resources',
    manual: 'User Manual',
    safetyInfo: 'Safety Information',
    warranty: 'Warranty',
    faq: 'FAQ',
    videos: 'Videos',
    repair: 'Repair Information',
    spareParts: 'Spare Parts',
    downloadCertificate: 'Download',
    validUntilLabel: 'Valid until',
    accessTitle: 'Customer Access',
    accessSubtitle: 'Enter your order number to view product transparency data.',
    orderNumber: 'Order Number',
    orderNumberPlaceholder: 'e.g. FB20240301-001',
    accessButton: 'View Products',
    accessError: 'Invalid order number. Please check and try again.',
  },
  de: {
    loading: 'Produkte werden geladen\u2026',
    error: 'Produktdaten konnten nicht geladen werden.',
    retry: 'Erneut versuchen',
    noProducts: 'Noch keine Produkte ver\u00f6ffentlicht.',
    productTransparency: 'Produkttransparenz',
    subtitle: 'Vollst\u00e4ndige Lieferketten- & Nachhaltigkeitsdaten',
    materials: 'Materialien',
    certifications: 'Zertifizierungen',
    carbonFootprint: 'CO\u2082-Fu\u00dfabdruck',
    recyclability: 'Recyclingf\u00e4higkeit',
    sustainability: 'Nachhaltigkeit',
    batches: 'Chargen',
    viewDPP: 'Vollst\u00e4ndiger DPP',
    viewBatchDPP: 'DPP anzeigen',
    recycledContent: 'Recyclinganteil',
    durability: 'Haltbarkeit',
    repairability: 'Reparierbarkeit',
    energyUse: 'Energie',
    origin: 'Herkunft',
    ceMarked: 'CE-Kennzeichnung',
    batchNumber: 'Charge',
    produced: 'Produziert',
    expires: 'Ablaufdatum',
    quantity: 'Menge',
    weight: 'Gewicht',
    dimensions: 'Ma\u00dfe',
    differsFromBase: 'Weicht vom Basisprodukt ab',
    years: 'Jahre',
    kwhPerYear: 'kWh/Jahr',
    kgCO2: 'kg CO\u2082',
    overrides: 'Ge\u00e4ndert',
    noOverrides: 'Wie Basisprodukt',
    poweredBy: 'Bereitgestellt von Trackbliss',
    documents: 'Dokumente & Zertifikate',
    support: 'Support & Ressourcen',
    manual: 'Bedienungsanleitung',
    safetyInfo: 'Sicherheitsinformationen',
    warranty: 'Garantie',
    faq: 'FAQ',
    videos: 'Videos',
    repair: 'Reparaturinformationen',
    spareParts: 'Ersatzteile',
    downloadCertificate: 'Herunterladen',
    validUntilLabel: 'G\u00fcltig bis',
    accessTitle: 'Kundenzugang',
    accessSubtitle: 'Geben Sie Ihre Bestellnummer ein, um die Produkttransparenzdaten einzusehen.',
    orderNumber: 'Bestellnummer',
    orderNumberPlaceholder: 'z.B. FB20240301-001',
    accessButton: 'Produkte anzeigen',
    accessError: 'Ung\u00fcltige Bestellnummer. Bitte pr\u00fcfen und erneut versuchen.',
  },
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface TransparencyDesign {
  preset?: string;
  primaryColor?: string | null;
  colorScheme?: 'light' | 'dark' | 'auto';
  fontFamily?: string;
  heroStyle?: 'gradient' | 'solid' | 'image' | 'minimal';
  heroOverlayOpacity?: number;
  cardStyle?: 'rounded' | 'sharp' | 'soft';
  cardShadow?: 'none' | 'subtle' | 'medium' | 'strong';
  showPoweredBy?: boolean;
  accentColor?: string | null;
  pageBackground?: string | null;
  cardBackground?: string | null;
}

interface PageData {
  page: { title: string | null; description: string | null; heroImage: string | null };
  branding: { name: string; logo: string | null; primaryColor: string };
  design?: TransparencyDesign;
  accessControl?: { enabled: boolean; orderPrefix?: string };
  products: ApiProduct[];
}

interface ApiProduct {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  manufacturer: string | null;
  gtin: string | null;
  image: string | null;
  dppUrl: string | null;
  category: string | null;
  countryOfOrigin: string | null;
  dimensions: string | null;
  materials: ApiMaterial[];
  certifications: ApiCertification[];
  carbonFootprint: { totalKgCO2: number; rating: string } | null;
  recyclability: { recyclablePercentage: number; instructions: string } | null;
  sustainability: {
    recycledContentPercentage: number | null;
    durabilityYears: number | null;
    repairabilityScore: number | null;
    energyConsumptionKwh: number | null;
  };
  ceMarking: boolean;
  packagingType: string | null;
  documents: ApiDocument[];
  supportResources: ApiSupportResources | null;
  userManualUrl: string | null;
  safetyInformation: string | null;
  batches: ApiBatch[];
}

interface ApiMaterial {
  name: string;
  percentage: number;
  recyclable: boolean;
  origin?: string;
}

interface ApiCertification {
  name: string;
  issuedBy: string;
  validUntil: string;
  certificateUrl?: string | null;
}

interface ApiDocument {
  id: string;
  name: string;
  category: string;
  url: string;
  type: string;
  size: number;
  validUntil: string | null;
}

interface ApiSupportResources {
  warranty?: { duration?: string; description?: string; url?: string };
  faq?: Array<{ question: string; answer: string }>;
  videos?: Array<{ title: string; url: string }>;
  repair?: { description?: string; url?: string };
  spareParts?: { description?: string; url?: string };
  [key: string]: unknown;
}

interface ApiBatch {
  batchNumber: string | null;
  serialNumber: string;
  productionDate: string | null;
  expirationDate: string | null;
  quantity: number | null;
  netWeight: number | null;
  grossWeight: number | null;
  dimensions: string | null;
  dppUrl: string | null;
  hasOverrides: boolean;
  overrides?: {
    materials?: ApiMaterial[];
    carbonFootprint?: { totalKgCO2: number; rating: string };
    recyclability?: { recyclablePercentage: number; instructions: string };
    description?: string;
  };
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const CARBON_RATING_COLORS: Record<string, { bg: string; text: string; ring: string }> = {
  A: { bg: '#dcfce7', text: '#15803d', ring: '#22c55e' },
  B: { bg: '#d1fae5', text: '#047857', ring: '#34d399' },
  C: { bg: '#fef9c3', text: '#a16207', ring: '#facc15' },
  D: { bg: '#fed7aa', text: '#c2410c', ring: '#fb923c' },
  E: { bg: '#fecaca', text: '#dc2626', ring: '#f87171' },
};

const FONT_MAP: Record<string, { url: string; heading: string; body: string; cssClass: string }> = {
  'dm-serif': {
    url: 'https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=DM+Serif+Display&display=swap',
    heading: "'DM Serif Display', Georgia, serif",
    body: "'DM Sans', system-ui, sans-serif",
    cssClass: 'tp-heading',
  },
  system: {
    url: '',
    heading: "system-ui, -apple-system, sans-serif",
    body: "system-ui, -apple-system, sans-serif",
    cssClass: 'tp-system',
  },
  inter: {
    url: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
    heading: "'Inter', system-ui, sans-serif",
    body: "'Inter', system-ui, sans-serif",
    cssClass: 'tp-inter',
  },
  poppins: {
    url: 'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap',
    heading: "'Poppins', system-ui, sans-serif",
    body: "'Poppins', system-ui, sans-serif",
    cssClass: 'tp-poppins',
  },
  playfair: {
    url: 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&family=DM+Sans:wght@400;500;600&display=swap',
    heading: "'Playfair Display', Georgia, serif",
    body: "'DM Sans', system-ui, sans-serif",
    cssClass: 'tp-playfair',
  },
  merriweather: {
    url: 'https://fonts.googleapis.com/css2?family=Merriweather:wght@400;700&family=DM+Sans:wght@400;500;600&display=swap',
    heading: "'Merriweather', Georgia, serif",
    body: "'DM Sans', system-ui, sans-serif",
    cssClass: 'tp-merriweather',
  },
};

const CARD_RADIUS: Record<string, string> = { sharp: '0.5rem', rounded: '1rem', soft: '1.5rem' };
const CARD_SHADOW: Record<string, string> = {
  none: 'none',
  subtle: '0 1px 3px rgba(0,0,0,0.06)',
  medium: '0 4px 12px rgba(0,0,0,0.08)',
  strong: '0 10px 40px rgba(0,0,0,0.12)',
};

function hexToHSL(hex: string): { h: number; s: number; l: number } {
  let r = 0, g = 0, b = 0;
  if (hex.length === 4) {
    r = parseInt(hex[1] + hex[1], 16); g = parseInt(hex[2] + hex[2], 16); b = parseInt(hex[3] + hex[3], 16);
  } else if (hex.length === 7) {
    r = parseInt(hex.slice(1, 3), 16); g = parseInt(hex.slice(3, 5), 16); b = parseInt(hex.slice(5, 7), 16);
  }
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (mx + mn) / 2;
  if (mx !== mn) {
    const d = mx - mn;
    s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    if (mx === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (mx === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function TransparencyPage() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();

  const isEmbed = location.pathname.startsWith('/embed/') || searchParams.get('embed') === 'true';
  const langParam = searchParams.get('lang');
  const [lang, setLang] = useState<'en' | 'de'>((langParam === 'de' ? 'de' : 'en'));
  const t = useCallback((key: string) => T[lang]?.[key] ?? T.en[key] ?? key, [lang]);

  const [data, setData] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<ApiProduct | null>(null);
  const [detailTab, setDetailTab] = useState<'overview' | 'batches'>('overview');

  const detailRef = useRef<HTMLDivElement>(null);

  // Access gate state
  const [gateUnlocked, setGateUnlocked] = useState(() => {
    if (!tenantSlug) return false;
    return sessionStorage.getItem(`tp-access-${tenantSlug}`) === '1';
  });
  const [orderInput, setOrderInput] = useState('');
  const [gateError, setGateError] = useState(false);

  const fetchData = useCallback(async () => {
    if (!tenantSlug) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/public/products?tenant=${encodeURIComponent(tenantSlug)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
    } catch {
      setError(t('error'));
    } finally {
      setLoading(false);
    }
  }, [tenantSlug, t]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const toggleLang = () => {
    const next = lang === 'en' ? 'de' : 'en';
    setLang(next);
    setSearchParams((prev) => { prev.set('lang', next); return prev; }, { replace: true });
  };

  const openDetail = (product: ApiProduct) => {
    setSelectedProduct(product);
    setDetailTab('overview');
    document.body.style.overflow = 'hidden';
  };

  const closeDetail = () => {
    setSelectedProduct(null);
    document.body.style.overflow = '';
  };

  // Derive colours from design + branding
  const ds = data?.design || {};
  const primary = ds.primaryColor || data?.branding.primaryColor || '#3B82F6';
  const hsl = hexToHSL(primary);
  const primaryLight = `hsl(${hsl.h}, ${hsl.s}%, 95%)`;
  const primaryMid = `hsl(${hsl.h}, ${hsl.s}%, 45%)`;
  const primaryDark = `hsl(${hsl.h}, ${Math.min(hsl.s, 60)}%, 25%)`;

  // Design tokens
  const isDark = ds.colorScheme === 'dark' || (ds.colorScheme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const pageBg = ds.pageBackground || (isDark ? '#0f172a' : '#fafaf9');
  const cardBg = ds.cardBackground || (isDark ? '#1e293b' : '#ffffff');
  const textColor = isDark ? '#e2e8f0' : '#1c1917';
  const textMuted = isDark ? '#94a3b8' : '#78716c';
  const borderColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)';
  const fontConfig = FONT_MAP[ds.fontFamily || 'dm-serif'] || FONT_MAP['dm-serif'];
  const cardRadius = CARD_RADIUS[ds.cardStyle || 'rounded'] || CARD_RADIUS.rounded;
  const cardShadow = CARD_SHADOW[ds.cardShadow || 'subtle'] || CARD_SHADOW.subtle;
  const heroStyle = ds.heroStyle || 'gradient';
  const heroOverlay = (ds.heroOverlayOpacity ?? 30) / 100;
  const showPoweredBy = ds.showPoweredBy !== false;

  // -----------------------------------------------------------------------
  // Render helpers
  // -----------------------------------------------------------------------

  // ---- Loading ----
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-stone-50">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" style={{ color: primary }} />
          <p className="text-sm text-stone-500 tracking-wide">{t('loading')}</p>
        </div>
      </div>
    );
  }

  // ---- Error ----
  if (error || !data) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-stone-50">
        <div className="text-center space-y-4 max-w-sm px-6">
          <AlertTriangle className="h-10 w-10 mx-auto text-amber-500" />
          <p className="text-stone-700">{error}</p>
          <button
            onClick={fetchData}
            className="px-5 py-2 rounded-full text-sm font-medium text-white transition-transform hover:scale-105"
            style={{ backgroundColor: primary }}
          >
            {t('retry')}
          </button>
        </div>
      </div>
    );
  }

  const { page, branding, products } = data;

  // ---- Access Gate ----
  const ac = data.accessControl;
  const needsGate = ac?.enabled && ac.orderPrefix && !gateUnlocked;

  const handleGateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const prefix = (ac?.orderPrefix || '').toUpperCase();
    const input = orderInput.trim().toUpperCase();
    if (input.length >= prefix.length && input.startsWith(prefix)) {
      setGateUnlocked(true);
      setGateError(false);
      if (tenantSlug) sessionStorage.setItem(`tp-access-${tenantSlug}`, '1');
    } else {
      setGateError(true);
    }
  };

  if (needsGate) {
    return (
      <div className="min-h-screen tp-body flex items-center justify-center px-4" style={{ backgroundColor: pageBg, color: textColor }}>
        {fontConfig.url && <link href={fontConfig.url} rel="stylesheet" />}
        <style>{`.tp-heading { font-family: ${fontConfig.heading}; } .tp-body { font-family: ${fontConfig.body}; }`}</style>

        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            {branding.logo ? (
              <img src={branding.logo} alt={branding.name} className="h-12 w-12 rounded-xl object-contain mx-auto mb-4" />
            ) : (
              <div className="h-12 w-12 rounded-xl flex items-center justify-center text-white text-lg font-bold mx-auto mb-4" style={{ backgroundColor: primary }}>
                {branding.name.charAt(0)}
              </div>
            )}
            <h1 className="tp-heading text-2xl sm:text-3xl mb-2" style={{ color: textColor }}>
              {t('accessTitle')}
            </h1>
            <p className="text-sm" style={{ color: textMuted }}>
              {t('accessSubtitle')}
            </p>
          </div>

          <form onSubmit={handleGateSubmit} className="rounded-2xl p-6 space-y-4" style={{ backgroundColor: cardBg, border: `1px solid ${borderColor}`, boxShadow: CARD_SHADOW.medium }}>
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: primaryLight }}>
                <KeyRound className="h-5 w-5" style={{ color: primary }} />
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: textColor }}>{t('orderNumber')}</p>
                <p className="text-xs" style={{ color: textMuted }}>{branding.name}</p>
              </div>
            </div>

            <input
              type="text"
              value={orderInput}
              onChange={(e) => { setOrderInput(e.target.value); setGateError(false); }}
              placeholder={t('orderNumberPlaceholder')}
              className="w-full px-4 py-3 rounded-xl text-sm font-mono outline-none transition-shadow focus:ring-2"
              style={{
                backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#fafaf9',
                border: `1px solid ${gateError ? '#ef4444' : borderColor}`,
                color: textColor,
                '--tw-ring-color': primary,
              } as CSSProperties}
              autoFocus
            />

            {gateError && (
              <p className="text-xs text-red-500 flex items-center gap-1.5">
                <AlertTriangle className="h-3 w-3" />
                {t('accessError')}
              </p>
            )}

            <button
              type="submit"
              disabled={!orderInput.trim()}
              className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:hover:scale-100 flex items-center justify-center gap-2"
              style={{ backgroundColor: primary }}
            >
              <Lock className="h-4 w-4" />
              {t('accessButton')}
            </button>
          </form>

          {/* Language toggle */}
          <div className="text-center mt-6">
            <button
              onClick={toggleLang}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
              style={{ color: textMuted, backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }}
            >
              <Languages className="h-3.5 w-3.5" />
              {lang.toUpperCase()}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: pageBg, color: textColor, '--tp-primary': primary, '--tp-primary-light': primaryLight, '--tp-primary-mid': primaryMid, '--tp-primary-dark': primaryDark, '--tp-card-bg': cardBg, '--tp-card-radius': cardRadius, '--tp-card-shadow': cardShadow, '--tp-border': borderColor, '--tp-text-muted': textMuted } as CSSProperties}>
      {/* ---- Load fonts ---- */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      {fontConfig.url && <link href={fontConfig.url} rel="stylesheet" />}

      <style>{`
        .tp-heading { font-family: ${fontConfig.heading}; }
        .tp-body { font-family: ${fontConfig.body}; }
        .tp-card { transition: transform 0.35s cubic-bezier(.4,0,.2,1), box-shadow 0.35s cubic-bezier(.4,0,.2,1); }
        .tp-card:hover { transform: translateY(-6px); box-shadow: 0 20px 60px -12px rgba(0,0,0,0.12); }
        .tp-fade-in { animation: tpFadeIn 0.5s ease both; }
        .tp-slide-up { animation: tpSlideUp 0.45s cubic-bezier(.4,0,.2,1) both; }
        @keyframes tpFadeIn { from { opacity:0; } to { opacity:1; } }
        @keyframes tpSlideUp { from { opacity:0; transform:translateY(24px); } to { opacity:1; transform:translateY(0); } }
        .tp-bar { transition: width 0.8s cubic-bezier(.4,0,.2,1); }
        .tp-ring-anim { animation: tpRingGrow 1s cubic-bezier(.4,0,.2,1) both; }
        @keyframes tpRingGrow { from { stroke-dashoffset: 283; } }
        .tp-overlay { animation: tpOverlay 0.3s ease both; }
        @keyframes tpOverlay { from { opacity:0; } to { opacity:1; } }
        .tp-modal { animation: tpModal 0.35s cubic-bezier(.22,1,.36,1) both; }
        @keyframes tpModal { from { opacity:0; transform:translateY(40px) scale(0.96); } to { opacity:1; transform:translateY(0) scale(1); } }
        .tp-stagger-1 { animation-delay: 0.05s; }
        .tp-stagger-2 { animation-delay: 0.10s; }
        .tp-stagger-3 { animation-delay: 0.15s; }
        .tp-stagger-4 { animation-delay: 0.20s; }
        .tp-stagger-5 { animation-delay: 0.25s; }
        .tp-stagger-6 { animation-delay: 0.30s; }
      `}</style>

      {/* ================================================================== */}
      {/* HEADER (hidden in embed) */}
      {/* ================================================================== */}
      {!isEmbed && (
        <header className="tp-body sticky top-0 z-40 backdrop-blur-xl border-b" style={{ backgroundColor: isDark ? 'rgba(15,23,42,0.8)' : 'rgba(255,255,255,0.8)', borderColor: borderColor }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {branding.logo ? (
                <img src={branding.logo} alt={branding.name} className="h-8 w-8 rounded-lg object-contain" />
              ) : (
                <div className="h-8 w-8 rounded-lg flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: primary }}>
                  {branding.name.charAt(0)}
                </div>
              )}
              <span className="font-semibold text-sm tracking-tight" style={{ color: textColor }}>{branding.name}</span>
            </div>
            <button
              onClick={toggleLang}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
              style={{ color: textMuted, backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }}
            >
              <Languages className="h-3.5 w-3.5" />
              {lang.toUpperCase()}
            </button>
          </div>
        </header>
      )}

      {/* ================================================================== */}
      {/* HERO */}
      {/* ================================================================== */}
      {heroStyle !== 'minimal' && (
      <section
        className="tp-body relative overflow-hidden"
        style={{
          background: heroStyle === 'image' && page.heroImage
            ? `url(${page.heroImage}) center/cover no-repeat`
            : heroStyle === 'solid'
              ? primary
              : `linear-gradient(135deg, ${primaryDark} 0%, ${primary} 50%, ${primaryMid} 100%)`,
          minHeight: isEmbed ? '120px' : '220px',
        }}
      >
        {/* overlay for readability */}
        <div className="absolute inset-0" style={{ backgroundColor: `rgba(0,0,0,${heroOverlay})` }} />
        {/* subtle grain texture */}
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")' }} />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 flex flex-col items-center text-center">
          <h1 className="tp-heading text-3xl sm:text-4xl lg:text-5xl text-white tp-fade-in leading-tight">
            {page.title || t('productTransparency')}
          </h1>
          {(page.description || !page.title) && (
            <p className="mt-3 text-white/80 text-sm sm:text-base max-w-xl tp-fade-in" style={{ animationDelay: '0.15s' }}>
              {page.description || t('subtitle')}
            </p>
          )}
        </div>
      </section>
      )}

      {/* Minimal hero — just title inline */}
      {heroStyle === 'minimal' && (
        <section className="tp-body max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 sm:pt-14 pb-2 text-center">
          <h1 className="tp-heading text-3xl sm:text-4xl leading-tight" style={{ color: textColor }}>
            {page.title || t('productTransparency')}
          </h1>
          {(page.description || !page.title) && (
            <p className="mt-2 text-sm sm:text-base max-w-xl mx-auto" style={{ color: textMuted }}>
              {page.description || t('subtitle')}
            </p>
          )}
        </section>
      )}

      {/* ================================================================== */}
      {/* PRODUCT GRID */}
      {/* ================================================================== */}
      <section className="tp-body max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        {products.length === 0 ? (
          <div className="text-center py-20">
            <Package className="h-12 w-12 mx-auto mb-4" style={{ color: textMuted }} />
            <p style={{ color: textMuted }}>{t('noProducts')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product, idx) => (
              <ProductCard
                key={product.id}
                product={product}
                primary={primary}
                stagger={idx}
                onClick={() => openDetail(product)}
                cardBg={cardBg}
                cardRadius={cardRadius}
                cardShadow={cardShadow}
                borderColor={borderColor}
                textColor={textColor}
                textMuted={textMuted}
                isDark={isDark}
              />
            ))}
          </div>
        )}
      </section>

      {/* ================================================================== */}
      {/* FOOTER (hidden in embed) */}
      {/* ================================================================== */}
      {!isEmbed && showPoweredBy && (
        <footer className="tp-body border-t py-6 text-center" style={{ borderColor, backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.5)' }}>
          <p className="text-xs tracking-wide" style={{ color: textMuted }}>{t('poweredBy')}</p>
        </footer>
      )}

      {/* ================================================================== */}
      {/* DETAIL MODAL */}
      {/* ================================================================== */}
      {selectedProduct && (
        <ProductDetail
          product={selectedProduct}
          primary={primary}
          primaryLight={primaryLight}
          t={t}
          lang={lang}
          tab={detailTab}
          setTab={setDetailTab}
          onClose={closeDetail}
          detailRef={detailRef}
        />
      )}
    </div>
  );
}

// ===========================================================================
// ProductCard
// ===========================================================================
function ProductCard({
  product,
  primary,
  stagger,
  onClick,
  cardBg,
  cardRadius,
  cardShadow,
  borderColor,
  textColor,
  textMuted,
  isDark,
}: {
  product: ApiProduct;
  primary: string;
  stagger: number;
  onClick: () => void;
  cardBg: string;
  cardRadius: string;
  cardShadow: string;
  borderColor: string;
  textColor: string;
  textMuted: string;
  isDark: boolean;
}) {
  const rating = product.carbonFootprint?.rating;
  const ratingStyle = rating ? CARBON_RATING_COLORS[rating] : null;
  const staggerClass = `tp-stagger-${Math.min(stagger + 1, 6)}`;

  return (
    <button
      onClick={onClick}
      className={`tp-card tp-slide-up ${staggerClass} tp-body group text-left w-full overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2`}
      style={{ '--tw-ring-color': primary, backgroundColor: cardBg, borderRadius: cardRadius, boxShadow: cardShadow, border: `1px solid ${borderColor}` } as CSSProperties}
    >
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden" style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f5f5f4' }}>
        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="h-12 w-12" style={{ color: textMuted }} />
          </div>
        )}

        {/* Category chip */}
        {product.category && (
          <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[11px] font-medium backdrop-blur-sm shadow-sm" style={{ backgroundColor: isDark ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.9)', color: isDark ? '#e2e8f0' : '#44403c', border: `1px solid ${borderColor}` }}>
            {product.category}
          </span>
        )}

        {/* Hover arrow */}
        <div className="absolute bottom-3 right-3 h-8 w-8 rounded-full backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 shadow-sm" style={{ backgroundColor: isDark ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.9)' }}>
          <ArrowUpRight className="h-4 w-4" style={{ color: textColor }} />
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        <h3 className="tp-heading text-lg leading-snug" style={{ color: textColor }}>{product.name}</h3>
        {product.manufacturer && (
          <p className="text-xs mt-0.5" style={{ color: textMuted }}>{product.manufacturer}</p>
        )}

        {/* Quick badges */}
        <div className="mt-4 flex flex-wrap gap-2">
          {ratingStyle && (
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold"
              style={{ backgroundColor: ratingStyle.bg, color: ratingStyle.text }}
            >
              <Leaf className="h-3 w-3" /> {rating}
            </span>
          )}
          {product.recyclability && product.recyclability.recyclablePercentage > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700">
              <Recycle className="h-3 w-3" /> {product.recyclability.recyclablePercentage}%
            </span>
          )}
          {product.certifications.length > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700">
              <Award className="h-3 w-3" /> {product.certifications.length}
            </span>
          )}
          {product.materials.length > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium" style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#f5f5f4', color: textMuted }}>
              <Layers className="h-3 w-3" /> {product.materials.length}
            </span>
          )}
          {product.documents && product.documents.length > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-700">
              <FileText className="h-3 w-3" /> {product.documents.length}
            </span>
          )}
          {product.batches.length > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-violet-50 text-violet-700">
              <BarChart3 className="h-3 w-3" /> {product.batches.length}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

// ===========================================================================
// ProductDetail (Modal)
// ===========================================================================
function ProductDetail({
  product,
  primary,
  primaryLight,
  t,
  lang,
  tab,
  setTab,
  onClose,
  detailRef,
}: {
  product: ApiProduct;
  primary: string;
  primaryLight: string;
  t: (k: string) => string;
  lang: string;
  tab: 'overview' | 'batches';
  setTab: (t: 'overview' | 'batches') => void;
  onClose: () => void;
  detailRef: React.RefObject<HTMLDivElement | null>;
}) {
  // close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const rating = product.carbonFootprint?.rating;
  const ratingStyle = rating ? CARBON_RATING_COLORS[rating] : null;
  const hasBatches = product.batches.length > 0;

  return (
    <div className="fixed inset-0 z-50 tp-overlay" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* Panel */}
      <div className="relative h-full flex items-start justify-center overflow-y-auto pt-8 pb-8 px-4" onClick={(e) => e.stopPropagation()}>
        <div
          ref={detailRef}
          className="tp-modal tp-body relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 h-9 w-9 rounded-full bg-black/10 backdrop-blur-sm text-white hover:bg-black/20 flex items-center justify-center transition-colors"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Hero image */}
          <div className="relative h-48 sm:h-64 bg-stone-100 overflow-hidden">
            {product.image ? (
              <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${primary}, ${primaryLight})` }}>
                <Package className="h-16 w-16 text-white/50" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
            <div className="absolute bottom-4 left-5 right-14">
              <h2 className="tp-heading text-2xl sm:text-3xl text-white leading-tight">{product.name}</h2>
              {product.manufacturer && (
                <p className="text-white/70 text-sm mt-1">{product.manufacturer}</p>
              )}
            </div>
          </div>

          {/* Tab bar */}
          <div className="border-b border-stone-200 px-5 flex gap-1 bg-stone-50/50">
            <TabButton active={tab === 'overview'} onClick={() => setTab('overview')} primary={primary}>
              {t('sustainability')}
            </TabButton>
            {hasBatches && (
              <TabButton active={tab === 'batches'} onClick={() => setTab('batches')} primary={primary}>
                {t('batches')} ({product.batches.length})
              </TabButton>
            )}
          </div>

          {/* Content */}
          <div className="p-5 sm:p-7 space-y-7">
            {tab === 'overview' ? (
              <OverviewTab product={product} primary={primary} primaryLight={primaryLight} t={t} lang={lang} ratingStyle={ratingStyle} rating={rating} />
            ) : (
              <BatchesTab product={product} primary={primary} t={t} lang={lang} />
            )}

            {/* View Full DPP */}
            {product.dppUrl && (
              <a
                href={product.dppUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-semibold text-white transition-transform hover:scale-[1.02] active:scale-[0.98]"
                style={{ backgroundColor: primary }}
              >
                {t('viewDPP')}
                <ExternalLink className="h-4 w-4" />
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, primary, children }: { active: boolean; onClick: () => void; primary: string; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="relative px-4 py-3 text-sm font-medium transition-colors"
      style={{ color: active ? primary : '#78716c' }}
    >
      {children}
      {active && (
        <span className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full" style={{ backgroundColor: primary }} />
      )}
    </button>
  );
}

// ===========================================================================
// OverviewTab
// ===========================================================================
function OverviewTab({
  product,
  primary,
  primaryLight,
  t,
  lang,
  ratingStyle,
  rating,
}: {
  product: ApiProduct;
  primary: string;
  primaryLight: string;
  t: (k: string) => string;
  lang: string;
  ratingStyle: { bg: string; text: string; ring: string } | null;
  rating: string | undefined;
}) {
  const { sustainability, recyclability, materials, certifications, carbonFootprint } = product;

  return (
    <>
      {/* Quick stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {carbonFootprint && (
          <StatCard
            icon={<Leaf className="h-4 w-4" />}
            label={t('carbonFootprint')}
            value={`${carbonFootprint.totalKgCO2} ${t('kgCO2')}`}
            badge={rating}
            badgeStyle={ratingStyle ? { backgroundColor: ratingStyle.bg, color: ratingStyle.text } : undefined}
          />
        )}
        {recyclability && recyclability.recyclablePercentage > 0 && (
          <StatCard
            icon={<Recycle className="h-4 w-4" />}
            label={t('recyclability')}
            value={`${recyclability.recyclablePercentage}%`}
          />
        )}
        {sustainability.repairabilityScore != null && (
          <StatCard
            icon={<Wrench className="h-4 w-4" />}
            label={t('repairability')}
            value={`${sustainability.repairabilityScore}/100`}
          />
        )}
        {sustainability.durabilityYears != null && (
          <StatCard
            icon={<Clock className="h-4 w-4" />}
            label={t('durability')}
            value={`${sustainability.durabilityYears} ${t('years')}`}
          />
        )}
        {sustainability.recycledContentPercentage != null && (
          <StatCard
            icon={<Recycle className="h-4 w-4" />}
            label={t('recycledContent')}
            value={`${sustainability.recycledContentPercentage}%`}
          />
        )}
        {sustainability.energyConsumptionKwh != null && (
          <StatCard
            icon={<Zap className="h-4 w-4" />}
            label={t('energyUse')}
            value={`${sustainability.energyConsumptionKwh} ${t('kwhPerYear')}`}
          />
        )}
        {product.countryOfOrigin && (
          <StatCard
            icon={<Globe className="h-4 w-4" />}
            label={t('origin')}
            value={product.countryOfOrigin}
          />
        )}
        {product.ceMarking && (
          <StatCard
            icon={<Shield className="h-4 w-4" />}
            label={t('ceMarked')}
            value="CE"
          />
        )}
      </div>

      {/* Materials */}
      {materials.length > 0 && (
        <section>
          <SectionTitle icon={<Layers className="h-4 w-4" />} label={t('materials')} primary={primary} />
          <div className="mt-3 space-y-2.5">
            {materials.map((mat, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-stone-700 truncate">{mat.name}</span>
                    <span className="text-stone-500 tabular-nums shrink-0 ml-2">{mat.percentage}%</span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-stone-100 overflow-hidden">
                    <div
                      className="tp-bar h-full rounded-full"
                      style={{ width: `${mat.percentage}%`, backgroundColor: mat.recyclable ? '#22c55e' : primary }}
                    />
                  </div>
                </div>
                {mat.recyclable && (
                  <Recycle className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Recyclability circle */}
      {recyclability && recyclability.recyclablePercentage > 0 && (
        <section>
          <SectionTitle icon={<Recycle className="h-4 w-4" />} label={t('recyclability')} primary={primary} />
          <div className="mt-3 flex items-center gap-6">
            <RecyclabilityRing percentage={recyclability.recyclablePercentage} primary={primary} />
            {recyclability.instructions && (
              <p className="text-sm text-stone-600 leading-relaxed flex-1">{recyclability.instructions}</p>
            )}
          </div>
        </section>
      )}

      {/* Certifications */}
      {certifications.length > 0 && (
        <section>
          <SectionTitle icon={<Award className="h-4 w-4" />} label={t('certifications')} primary={primary} />
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
            {certifications.map((cert, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-stone-50 border border-stone-100">
                <div className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: primaryLight }}>
                  <Shield className="h-4 w-4" style={{ color: primary }} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-stone-800 truncate">{cert.name}</p>
                  <p className="text-xs text-stone-500">{cert.issuedBy} &middot; {formatDate(cert.validUntil, lang)}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Documents & Certificates */}
      {(product.documents.length > 0 || certifications.some(c => c.certificateUrl)) && (
        <section>
          <SectionTitle icon={<FileText className="h-4 w-4" />} label={t('documents')} primary={primary} />
          <div className="mt-3 space-y-2">
            {/* Certificate downloads from certifications */}
            {certifications.filter(c => c.certificateUrl).map((cert, i) => (
              <a
                key={`cert-${i}`}
                href={cert.certificateUrl!}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-xl bg-stone-50 border border-stone-100 hover:border-stone-200 hover:bg-stone-100/50 transition-colors group"
              >
                <div className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0 bg-emerald-50">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-stone-800 truncate">{cert.name}</p>
                  <p className="text-xs text-stone-500">{cert.issuedBy}{cert.validUntil ? ` · ${t('validUntilLabel')} ${formatDate(cert.validUntil, lang)}` : ''}</p>
                </div>
                <Download className="h-4 w-4 text-stone-400 group-hover:text-stone-600 shrink-0 transition-colors" />
              </a>
            ))}
            {/* Other documents */}
            {product.documents.map((doc) => (
              <a
                key={doc.id}
                href={doc.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-xl bg-stone-50 border border-stone-100 hover:border-stone-200 hover:bg-stone-100/50 transition-colors group"
              >
                <div className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: primaryLight }}>
                  <FileText className="h-4 w-4" style={{ color: primary }} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-stone-800 truncate">{doc.name}</p>
                  <p className="text-xs text-stone-500">
                    {doc.category}{doc.size ? ` · ${formatFileSize(doc.size)}` : ''}
                    {doc.validUntil ? ` · ${t('validUntilLabel')} ${formatDate(doc.validUntil, lang)}` : ''}
                  </p>
                </div>
                <Download className="h-4 w-4 text-stone-400 group-hover:text-stone-600 shrink-0 transition-colors" />
              </a>
            ))}
          </div>
        </section>
      )}

      {/* Support & Resources */}
      {(product.userManualUrl || product.safetyInformation || product.supportResources) && (
        <section>
          <SectionTitle icon={<BookOpen className="h-4 w-4" />} label={t('support')} primary={primary} />
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
            {product.userManualUrl && (
              <a
                href={product.userManualUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-xl bg-stone-50 border border-stone-100 hover:border-stone-200 hover:bg-stone-100/50 transition-colors"
              >
                <div className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0 bg-blue-50">
                  <BookOpen className="h-4 w-4 text-blue-600" />
                </div>
                <span className="text-sm font-medium text-stone-800">{t('manual')}</span>
                <ExternalLink className="h-3.5 w-3.5 text-stone-400 ml-auto shrink-0" />
              </a>
            )}
            {product.safetyInformation && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-stone-50 border border-stone-100">
                <div className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0 bg-amber-50">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                </div>
                <span className="text-sm text-stone-700">{product.safetyInformation}</span>
              </div>
            )}
            {product.supportResources?.warranty?.url && (
              <a
                href={product.supportResources.warranty.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-xl bg-stone-50 border border-stone-100 hover:border-stone-200 hover:bg-stone-100/50 transition-colors"
              >
                <div className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0 bg-violet-50">
                  <Shield className="h-4 w-4 text-violet-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-stone-800">{t('warranty')}</p>
                  {product.supportResources.warranty.duration && (
                    <p className="text-xs text-stone-500">{product.supportResources.warranty.duration}</p>
                  )}
                </div>
                <ExternalLink className="h-3.5 w-3.5 text-stone-400 ml-auto shrink-0" />
              </a>
            )}
            {product.supportResources?.repair?.url && (
              <a
                href={product.supportResources.repair.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-xl bg-stone-50 border border-stone-100 hover:border-stone-200 hover:bg-stone-100/50 transition-colors"
              >
                <div className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0 bg-orange-50">
                  <Wrench className="h-4 w-4 text-orange-600" />
                </div>
                <span className="text-sm font-medium text-stone-800">{t('repair')}</span>
                <ExternalLink className="h-3.5 w-3.5 text-stone-400 ml-auto shrink-0" />
              </a>
            )}
            {product.supportResources?.videos && product.supportResources.videos.length > 0 && (
              <a
                href={product.supportResources.videos[0].url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-xl bg-stone-50 border border-stone-100 hover:border-stone-200 hover:bg-stone-100/50 transition-colors"
              >
                <div className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0 bg-red-50">
                  <Video className="h-4 w-4 text-red-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-stone-800">{t('videos')}</p>
                  <p className="text-xs text-stone-500">{product.supportResources.videos.length} {product.supportResources.videos.length === 1 ? 'video' : 'videos'}</p>
                </div>
                <ExternalLink className="h-3.5 w-3.5 text-stone-400 ml-auto shrink-0" />
              </a>
            )}
            {product.supportResources?.faq && product.supportResources.faq.length > 0 && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-stone-50 border border-stone-100">
                <div className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0 bg-cyan-50">
                  <HelpCircle className="h-4 w-4 text-cyan-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-stone-800">{t('faq')}</p>
                  <p className="text-xs text-stone-500">{product.supportResources.faq.length} Q&A</p>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Description */}
      {product.description && (
        <section>
          <p className="text-sm text-stone-600 leading-relaxed">{product.description}</p>
        </section>
      )}
    </>
  );
}

// ===========================================================================
// BatchesTab
// ===========================================================================
function BatchesTab({
  product,
  primary,
  t,
  lang,
}: {
  product: ApiProduct;
  primary: string;
  t: (k: string) => string;
  lang: string;
}) {
  const { batches } = product;

  return (
    <div className="space-y-4">
      {batches.map((batch, idx) => (
        <div
          key={batch.serialNumber}
          className="tp-slide-up rounded-2xl border border-stone-200/60 bg-white overflow-hidden"
          style={{ animationDelay: `${idx * 0.08}s` }}
        >
          {/* Batch header */}
          <div className="px-5 py-3.5 flex items-center justify-between bg-stone-50/80 border-b border-stone-100">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg flex items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: primary }}>
                #{idx + 1}
              </div>
              <div>
                <p className="text-sm font-semibold text-stone-800">
                  {batch.batchNumber || batch.serialNumber}
                </p>
                {batch.productionDate && (
                  <p className="text-xs text-stone-500">{t('produced')}: {formatDate(batch.productionDate, lang)}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {batch.hasOverrides && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200/50">
                  <AlertTriangle className="h-2.5 w-2.5" />
                  {t('overrides')}
                </span>
              )}
              {batch.dppUrl && (
                <a
                  href={batch.dppUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium text-white transition-opacity hover:opacity-90"
                  style={{ backgroundColor: primary }}
                >
                  {t('viewBatchDPP')}
                  <ChevronRight className="h-3 w-3" />
                </a>
              )}
            </div>
          </div>

          {/* Batch details grid */}
          <div className="px-5 py-4 grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
            {batch.batchNumber && (
              <BatchField icon={<Hash />} label={t('batchNumber')} value={batch.batchNumber} />
            )}
            {batch.productionDate && (
              <BatchField icon={<CalendarDays />} label={t('produced')} value={formatDate(batch.productionDate, lang)} />
            )}
            {batch.expirationDate && (
              <BatchField icon={<Clock />} label={t('expires')} value={formatDate(batch.expirationDate, lang)} />
            )}
            {batch.quantity != null && (
              <BatchField icon={<Package />} label={t('quantity')} value={String(batch.quantity)} />
            )}
            {(batch.netWeight != null || batch.grossWeight != null) && (
              <BatchField
                icon={<Scale />}
                label={t('weight')}
                value={`${batch.netWeight ?? '?'} / ${batch.grossWeight ?? '?'} g`}
              />
            )}
            {batch.dimensions && (
              <BatchField icon={<Layers />} label={t('dimensions')} value={batch.dimensions} />
            )}
          </div>

          {/* Override comparison */}
          {batch.hasOverrides && batch.overrides && (
            <div className="border-t border-stone-100 px-5 py-4">
              <p className="text-xs font-semibold text-amber-700 mb-3 flex items-center gap-1.5">
                <AlertTriangle className="h-3 w-3" />
                {t('differsFromBase')}
              </p>
              <div className="space-y-3">
                {/* Carbon override */}
                {batch.overrides.carbonFootprint && (
                  <OverrideRow
                    label={t('carbonFootprint')}
                    base={product.carbonFootprint ? `${product.carbonFootprint.totalKgCO2} ${t('kgCO2')} (${product.carbonFootprint.rating})` : '—'}
                    override={`${batch.overrides.carbonFootprint.totalKgCO2} ${t('kgCO2')} (${batch.overrides.carbonFootprint.rating})`}
                    primary={primary}
                  />
                )}
                {/* Recyclability override */}
                {batch.overrides.recyclability && (
                  <OverrideRow
                    label={t('recyclability')}
                    base={product.recyclability ? `${product.recyclability.recyclablePercentage}%` : '—'}
                    override={`${batch.overrides.recyclability.recyclablePercentage}%`}
                    primary={primary}
                  />
                )}
                {/* Materials override */}
                {batch.overrides.materials && (
                  <div className="rounded-xl bg-amber-50/50 border border-amber-100 p-3">
                    <p className="text-xs font-medium text-stone-600 mb-2">{t('materials')} ({t('overrides').toLowerCase()})</p>
                    <div className="space-y-1.5">
                      {batch.overrides.materials.map((mat, i) => (
                        <div key={i} className="flex items-center justify-between text-xs">
                          <span className="text-stone-700">{mat.name}</span>
                          <span className="text-stone-500 tabular-nums">{mat.percentage}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {/* Description override */}
                {batch.overrides.description && (
                  <div className="rounded-xl bg-amber-50/50 border border-amber-100 p-3">
                    <p className="text-xs text-stone-600">{batch.overrides.description}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ===========================================================================
// Shared sub-components
// ===========================================================================

function StatCard({
  icon,
  label,
  value,
  badge,
  badgeStyle,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  badge?: string;
  badgeStyle?: CSSProperties;
}) {
  return (
    <div className="rounded-xl bg-stone-50 border border-stone-100 p-3 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-stone-400">{icon}</span>
        {badge && (
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md" style={badgeStyle}>
            {badge}
          </span>
        )}
      </div>
      <div>
        <p className="text-xs text-stone-500 leading-none">{label}</p>
        <p className="text-sm font-semibold text-stone-800 mt-0.5">{value}</p>
      </div>
    </div>
  );
}

function SectionTitle({ icon, label, primary }: { icon: React.ReactNode; label: string; primary: string }) {
  return (
    <div className="flex items-center gap-2">
      <span style={{ color: primary }}>{icon}</span>
      <h3 className="text-sm font-semibold text-stone-800">{label}</h3>
    </div>
  );
}

function RecyclabilityRing({ percentage, primary }: { percentage: number; primary: string }) {
  const circumference = 2 * Math.PI * 45;
  const offset = circumference - (percentage / 100) * circumference;
  return (
    <div className="relative h-20 w-20 shrink-0">
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
        <circle cx="50" cy="50" r="45" fill="none" stroke="#e7e5e4" strokeWidth="8" />
        <circle
          cx="50" cy="50" r="45" fill="none"
          stroke={primary}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="tp-ring-anim"
          style={{ '--ring-offset': offset } as CSSProperties}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-lg font-bold text-stone-800">{percentage}%</span>
      </div>
    </div>
  );
}

function BatchField({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-stone-400 mt-0.5 h-3.5 w-3.5 shrink-0 [&>svg]:h-3.5 [&>svg]:w-3.5">{icon}</span>
      <div className="min-w-0">
        <p className="text-xs text-stone-500">{label}</p>
        <p className="text-sm font-medium text-stone-800 truncate">{value}</p>
      </div>
    </div>
  );
}

function OverrideRow({ label, base, override, primary }: { label: string; base: string; override: string; primary: string }) {
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-xs rounded-xl bg-amber-50/50 border border-amber-100 px-3 py-2.5" title={label}>
      <div>
        <p className="text-stone-400 text-[10px] mb-0.5">{label}</p>
        <p className="text-stone-600 line-through">{base}</p>
      </div>
      <ChevronRight className="h-3 w-3 text-amber-400" />
      <div>
        <p className="text-[10px] mb-0.5" style={{ color: primary }}>Batch</p>
        <p className="font-semibold text-stone-800">{override}</p>
      </div>
    </div>
  );
}

// ===========================================================================
// Helpers
// ===========================================================================
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function formatDate(d: string, lang: string): string {
  try {
    return new Date(d).toLocaleDateString(lang === 'de' ? 'de-DE' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return d;
  }
}
