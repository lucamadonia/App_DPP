import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  Shield, FileCheck, Package, Pencil, Trash2, Link2, CheckCircle2, XCircle,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { gridItem, useReducedMotion } from '@/lib/motion';
import { SupplierAvatar } from './SupplierAvatar';
import { StarRating } from './SupplierBadges';
import { SUPPLIER_TYPES, STATUS_DOT_CLASS, countryFlag } from './supplier-helpers';
import type { Supplier } from '@/types/database';

const STATUS_LABEL_KEY: Record<Supplier['status'], string> = {
  active: 'Active',
  inactive: 'Inactive',
  blocked: 'Blocked',
  pending_approval: 'Pending Approval',
};

interface SupplierCardProps {
  supplier: Supplier;
  countryName: string;
  productCount?: number;
  onOpenDetail: (supplier: Supplier) => void;
  onOpenFullPage: (supplier: Supplier) => void;
  onEdit: (supplier: Supplier) => void;
  onAssignProducts: (supplier: Supplier) => void;
  onDelete: (id: string) => void;
  onApprove: (supplier: Supplier) => void;
  onReject: (supplier: Supplier) => void;
}

/** Supplier scorecard: avatar, status traffic light, verification, certs/products counts, country */
export function SupplierCard({
  supplier, countryName, productCount,
  onOpenDetail, onOpenFullPage, onEdit, onAssignProducts, onDelete, onApprove, onReject,
}: SupplierCardProps) {
  const { t } = useTranslation('settings');
  const prefersReduced = useReducedMotion();
  const isPending = supplier.status === 'pending_approval';
  const typeConfig = SUPPLIER_TYPES.find(st => st.value === supplier.supplier_type);
  const TypeIcon = typeConfig?.icon;

  return (
    <motion.div
      variants={prefersReduced ? undefined : gridItem}
      whileHover={prefersReduced ? undefined : { y: -3 }}
      whileTap={prefersReduced ? undefined : { scale: 0.97 }}
      className="h-full"
    >
      <Card
        role="button"
        tabIndex={0}
        className="group h-full cursor-pointer transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={() => onOpenDetail(supplier)}
        onDoubleClick={() => onOpenFullPage(supplier)}
        onKeyDown={(e) => { if (e.key === 'Enter') onOpenDetail(supplier); }}
      >
        <CardContent className="flex h-full flex-col gap-3 p-4">
          {/* Header: avatar + name + status dot */}
          <div className="flex items-start gap-3">
            <SupplierAvatar name={supplier.name} size="md" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="truncate font-semibold">{supplier.name}</span>
                {supplier.verified && (
                  <Shield className="h-3.5 w-3.5 shrink-0 text-blue-600" aria-label={t('Verified')} />
                )}
              </div>
              <div className="truncate text-xs text-muted-foreground">
                {supplier.code ? `${supplier.code} | ` : ''}{supplier.legal_form || ''}
              </div>
              <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className={`h-2 w-2 shrink-0 rounded-full ${STATUS_DOT_CLASS[supplier.status]}`} />
                {t(STATUS_LABEL_KEY[supplier.status])}
                {TypeIcon && (
                  <span className="flex items-center gap-1 truncate">
                    · <TypeIcon className="h-3 w-3" /> {t(typeConfig!.labelKey)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Scorecard metrics */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
            <span className="flex items-center gap-1" title={countryName}>
              <span aria-hidden="true">{countryFlag(supplier.country)}</span>
              <span className="font-medium uppercase">{supplier.country}</span>
              {supplier.city && <span className="truncate">· {supplier.city}</span>}
            </span>
            <span className="flex items-center gap-1 tabular-nums" title={t('Certifications')}>
              <FileCheck className="h-3.5 w-3.5" />
              {supplier.certifications?.length || 0}
            </span>
            <span className="flex items-center gap-1 tabular-nums" title={t('Assigned Products')}>
              <Package className="h-3.5 w-3.5" />
              {productCount ?? 0}
            </span>
            {supplier.quality_rating ? <StarRating rating={supplier.quality_rating} /> : null}
          </div>

          {supplier.risk_level === 'high' && (
            <Badge variant="destructive" className="w-fit text-xs">{t('High Risk')}</Badge>
          )}

          {/* Actions */}
          <div
            className="mt-auto flex items-center gap-1 border-t pt-2"
            onClick={(e) => e.stopPropagation()}
            onDoubleClick={(e) => e.stopPropagation()}
          >
            {isPending ? (
              <>
                <Button
                  size="sm"
                  className="min-h-[44px] flex-1 bg-green-600 hover:bg-green-700 sm:min-h-9"
                  onClick={() => onApprove(supplier)}
                >
                  <CheckCircle2 className="mr-1.5 h-4 w-4" />
                  {t('Approve')}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="min-h-[44px] flex-1 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 sm:min-h-9 dark:border-red-900 dark:hover:bg-red-950"
                  onClick={() => onReject(supplier)}
                >
                  <XCircle className="mr-1.5 h-4 w-4" />
                  {t('Reject')}
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="min-h-[44px] min-w-[44px] sm:min-h-9 sm:min-w-9"
                  onClick={() => onAssignProducts(supplier)}
                  title={t('Assign Products')}
                >
                  <Link2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="min-h-[44px] min-w-[44px] sm:min-h-9 sm:min-w-9"
                  onClick={() => onEdit(supplier)}
                  title={t('Edit Supplier')}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="ml-auto min-h-[44px] min-w-[44px] sm:min-h-9 sm:min-w-9"
                  onClick={() => onDelete(supplier.id)}
                  title={t('Delete', { ns: 'common' })}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
