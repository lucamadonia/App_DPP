/**
 * Main Canvas Component
 *
 * Scrollable main area with accordion categories containing field rows.
 */

import { useMemo } from 'react';
import type { VisibilityConfigV3, FieldDefinition } from '@/types/visibility';
import { fieldDefinitions } from '@/types/visibility';
import { Accordion } from '@/components/ui/accordion';
import { CategorySection } from './CategorySection';

interface MainCanvasProps {
  config: VisibilityConfigV3;
  searchQuery: string;
  expandedCategories: Set<string>;
  onToggle: (field: string, level: 'consumer' | 'customs', value: boolean) => void;
  onCategoryToggle: (categories: Set<string>) => void;
  onCategoryBulkToggle: (category: string, level: 'consumer' | 'customs', value: boolean) => void;
}

export function MainCanvas({
  config,
  searchQuery,
  expandedCategories,
  onToggle,
  onCategoryToggle,
  onCategoryBulkToggle,
}: MainCanvasProps) {
  // Group fields by category
  const categorizedFields = useMemo(() => {
    const grouped = new Map<string, FieldDefinition[]>();
    for (const field of fieldDefinitions) {
      if (!grouped.has(field.category)) {
        grouped.set(field.category, []);
      }
      grouped.get(field.category)!.push(field);
    }
    return grouped;
  }, []);

  // Filter by search
  const filteredCategories = useMemo(() => {
    if (!searchQuery) return Array.from(categorizedFields.entries());

    const query = searchQuery.toLowerCase();
    return Array.from(categorizedFields.entries())
      .map(
        ([category, fields]) =>
          [
            category,
            fields.filter(
              (f) =>
                f.label.toLowerCase().includes(query) ||
                f.description?.toLowerCase().includes(query) ||
                f.category.toLowerCase().includes(query)
            ),
          ] as [string, FieldDefinition[]]
      )
      .filter(([, fields]) => fields.length > 0);
  }, [categorizedFields, searchQuery]);

  return (
    <div className="px-3 py-3 md:px-6 md:py-4">
      <Accordion
        type="multiple"
        value={Array.from(expandedCategories)}
        onValueChange={(value) => onCategoryToggle(new Set(value))}
        className="space-y-3"
      >
        {filteredCategories.map(([category, fields]) => (
          <CategorySection
            key={category}
            category={category}
            fields={fields}
            config={config}
            onToggle={onToggle}
            onBulkToggle={onCategoryBulkToggle}
            searchQuery={searchQuery}
          />
        ))}
      </Accordion>
    </div>
  );
}
