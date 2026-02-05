/**
 * Category Section Component
 *
 * Accordion item for a category with bulk toggle bar and field rows.
 */

import { Users, ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { VisibilityConfigV3, FieldDefinition } from '@/types/visibility';
import { AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FieldRow } from './FieldRow';

interface CategorySectionProps {
  category: string;
  fields: FieldDefinition[];
  config: VisibilityConfigV3;
  onToggle: (field: string, level: 'consumer' | 'customs', value: boolean) => void;
  onBulkToggle: (category: string, level: 'consumer' | 'customs', value: boolean) => void;
  searchQuery: string;
}

export function CategorySection({
  category,
  fields,
  config,
  onToggle,
  onBulkToggle,
  searchQuery,
}: CategorySectionProps) {
  const { t } = useTranslation('dpp');

  const consumerCount = fields.filter((f) => config.fields[f.key]?.consumer).length;
  const customsCount = fields.filter((f) => config.fields[f.key]?.customs).length;

  return (
    <AccordionItem value={category} className="border rounded-lg">
      <AccordionTrigger className="px-4 py-3 hover:no-underline group">
        <div className="flex items-center justify-between w-full pr-2">
          <div className="flex items-center gap-3">
            <div className="text-left">
              <div className="font-medium">{category}</div>
              <div className="text-xs text-muted-foreground">
                {fields.length} {t('fields')}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1">
              <Users className="h-3 w-3 text-green-600" />
              {consumerCount}
            </Badge>
            <Badge variant="outline" className="gap-1">
              <ShieldCheck className="h-3 w-3 text-amber-600" />
              {customsCount}
            </Badge>
          </div>
        </div>
      </AccordionTrigger>

      <AccordionContent className="px-4 pb-4">
        {/* Bulk Toggle Bar */}
        <div className="mb-3 pb-3 border-b">
          <span className="text-xs text-muted-foreground mb-2 block md:inline md:mr-2">
            {t('Bulk toggle')}:
          </span>

          {/* Mobile: 2x2 Grid with large Touch Targets */}
          <div className="flex flex-col gap-2 md:hidden">
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-10 text-xs justify-start"
                onClick={() => onBulkToggle(category, 'consumer', true)}
              >
                <Users className="h-4 w-4 mr-2" />
                {t('Consumer ON')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-10 text-xs justify-start"
                onClick={() => onBulkToggle(category, 'consumer', false)}
              >
                <Users className="h-4 w-4 mr-2" />
                {t('Consumer OFF')}
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-10 text-xs justify-start"
                onClick={() => onBulkToggle(category, 'customs', true)}
              >
                <ShieldCheck className="h-4 w-4 mr-2" />
                {t('Customs ON')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-10 text-xs justify-start"
                onClick={() => onBulkToggle(category, 'customs', false)}
              >
                <ShieldCheck className="h-4 w-4 mr-2" />
                {t('Customs OFF')}
              </Button>
            </div>
          </div>

          {/* Desktop: Inline Buttons */}
          <div className="hidden md:flex md:items-center md:gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => onBulkToggle(category, 'consumer', true)}
            >
              <Users className="h-3 w-3 mr-1" />
              ON
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => onBulkToggle(category, 'consumer', false)}
            >
              <Users className="h-3 w-3 mr-1" />
              OFF
            </Button>
            <div className="w-px h-4 bg-border mx-1" />
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => onBulkToggle(category, 'customs', true)}
            >
              <ShieldCheck className="h-3 w-3 mr-1" />
              ON
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => onBulkToggle(category, 'customs', false)}
            >
              <ShieldCheck className="h-3 w-3 mr-1" />
              OFF
            </Button>
          </div>
        </div>

        {/* Field Rows */}
        <div className="space-y-2">
          {fields.map((field) => {
            const isSearchMatch = Boolean(
              searchQuery &&
                (field.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  field.description?.toLowerCase().includes(searchQuery.toLowerCase()))
            );

            return (
              <FieldRow
                key={field.key}
                field={field}
                consumerVisible={config.fields[field.key]?.consumer ?? false}
                customsVisible={config.fields[field.key]?.customs ?? false}
                onToggle={onToggle}
                isSearchMatch={isSearchMatch}
              />
            );
          })}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
