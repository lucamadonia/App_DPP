import {
  Mountain,
  Factory,
  Wrench,
  ClipboardCheck,
  Package,
  Warehouse,
  Truck,
  ArrowRightLeft,
  ShieldCheck,
  Clock,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  TrainFront,
  Ship,
  Plane,
  Leaf,
  type LucideIcon,
} from 'lucide-react';

// Process Type configuration
export interface ProcessTypeConfig {
  icon: LucideIcon;
  color: string;
  label: string;
}

export const PROCESS_TYPE_CONFIG: Record<string, ProcessTypeConfig> = {
  raw_material_sourcing: { icon: Mountain, color: 'amber', label: 'Raw Material Sourcing' },
  manufacturing: { icon: Factory, color: 'blue', label: 'Manufacturing' },
  assembly: { icon: Wrench, color: 'indigo', label: 'Assembly' },
  quality_control: { icon: ClipboardCheck, color: 'green', label: 'Quality Control' },
  packaging: { icon: Package, color: 'purple', label: 'Packaging' },
  warehousing: { icon: Warehouse, color: 'slate', label: 'Warehousing' },
  transport: { icon: Truck, color: 'orange', label: 'Transport' },
  distribution: { icon: ArrowRightLeft, color: 'teal', label: 'Distribution' },
  customs_clearance: { icon: ShieldCheck, color: 'red', label: 'Customs Clearance' },
};

// Status configuration
export interface StatusConfig {
  icon: LucideIcon;
  variant: 'secondary' | 'default' | 'outline' | 'destructive';
  color: string;
  label: string;
}

export const STATUS_CONFIG: Record<string, StatusConfig> = {
  planned: { icon: Clock, variant: 'secondary', color: 'slate', label: 'Planned' },
  in_progress: { icon: Loader2, variant: 'default', color: 'blue', label: 'In Progress' },
  completed: { icon: CheckCircle2, variant: 'outline', color: 'green', label: 'Completed' },
  delayed: { icon: AlertTriangle, variant: 'secondary', color: 'yellow', label: 'Delayed' },
  cancelled: { icon: XCircle, variant: 'destructive', color: 'red', label: 'Cancelled' },
};

// Transport mode configuration
export interface TransportConfig {
  icon: LucideIcon;
  label: string;
}

export const TRANSPORT_CONFIG: Record<string, TransportConfig> = {
  road: { icon: Truck, label: 'Road' },
  rail: { icon: TrainFront, label: 'Rail' },
  sea: { icon: Ship, label: 'Sea' },
  air: { icon: Plane, label: 'Air' },
  multimodal: { icon: ArrowRightLeft, label: 'Multimodal' },
};

// Color utility: map color name to Tailwind classes
export function getProcessTypeClasses(color: string): { bg: string; text: string; border: string } {
  const map: Record<string, { bg: string; text: string; border: string }> = {
    amber: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-300' },
    blue: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300' },
    indigo: { bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-300' },
    green: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300' },
    purple: { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-300' },
    slate: { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-300' },
    orange: { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-300' },
    teal: { bg: 'bg-teal-100', text: 'text-teal-700', border: 'border-teal-300' },
    red: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300' },
    yellow: { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-300' },
  };
  return map[color] || map.slate;
}

export function getStatusClasses(color: string): { bg: string; text: string } {
  const map: Record<string, { bg: string; text: string }> = {
    slate: { bg: 'bg-slate-100', text: 'text-slate-700' },
    blue: { bg: 'bg-blue-100', text: 'text-blue-700' },
    green: { bg: 'bg-green-100', text: 'text-green-700' },
    yellow: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
    red: { bg: 'bg-red-100', text: 'text-red-700' },
  };
  return map[color] || map.slate;
}

// Emissions icon
export { Leaf };
