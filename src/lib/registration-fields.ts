import {
  Recycle,
  Zap,
  FlaskConical,
  AlertTriangle,
  Database,
  ShieldCheck,
  Leaf,
  Package,
  Heart,
  BarChart3,
  type LucideIcon,
} from 'lucide-react';

export interface RegistrationFieldDef {
  key: string;
  label: string;
  placeholder: string;
  tooltip: string;
  icon: LucideIcon;
  type?: 'text' | 'select' | 'tags';
  options?: string[];
}

export const REGISTRATION_FIELDS: RegistrationFieldDef[] = [
  {
    key: 'weeeNumber',
    label: 'WEEE Registration Number',
    placeholder: 'DE12345678',
    tooltip: 'Registration number under the Waste Electrical and Electronic Equipment Directive',
    icon: Recycle,
  },
  {
    key: 'eprelNumber',
    label: 'EPREL Number',
    placeholder: '123456',
    tooltip: 'European Product Registry for Energy Labelling number',
    icon: Zap,
  },
  {
    key: 'reachNumber',
    label: 'REACH Registration',
    placeholder: '01-1234567890-12-0000',
    tooltip: 'Registration, Evaluation, Authorisation and Restriction of Chemicals',
    icon: FlaskConical,
  },
  {
    key: 'clpClassification',
    label: 'CLP/GHS Classification',
    placeholder: 'H301, H315',
    tooltip: 'Classification, Labelling and Packaging hazard codes',
    icon: AlertTriangle,
    type: 'tags',
  },
  {
    key: 'scipNumber',
    label: 'SCIP Number',
    placeholder: 'SCIP-...',
    tooltip: 'Substances of Concern In articles as such or in complex objects (Products)',
    icon: Database,
  },
  {
    key: 'ceDeclarationRef',
    label: 'CE Declaration Reference',
    placeholder: 'DoC-2024-001',
    tooltip: 'Reference number of the EU Declaration of Conformity',
    icon: ShieldCheck,
  },
  {
    key: 'rohsDeclarationRef',
    label: 'RoHS Declaration Reference',
    placeholder: 'RoHS-2024-001',
    tooltip: 'Restriction of Hazardous Substances declaration reference',
    icon: Leaf,
  },
  {
    key: 'lucidNumber',
    label: 'LUCID Registration Number',
    placeholder: 'DE1234567890123',
    tooltip: 'German packaging register (Zentrale Stelle Verpackungsregister)',
    icon: Package,
  },
  {
    key: 'udi',
    label: 'UDI (Medical Device)',
    placeholder: '(01)12345678901234',
    tooltip: 'Unique Device Identification for medical devices',
    icon: Heart,
  },
  {
    key: 'energyLabelClass',
    label: 'Energy Label Class',
    placeholder: 'Select class...',
    tooltip: 'EU Energy Label classification from A (most efficient) to G',
    icon: BarChart3,
    type: 'select',
    options: ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
  },
];
