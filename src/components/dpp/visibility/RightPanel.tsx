/**
 * Right Panel Component
 *
 * Stats and changes tracker in tabbed interface.
 */

import { useTranslation } from 'react-i18next';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StatsCard } from './StatsCard';
import { ChangesTracker } from './ChangesTracker';

interface VisibilityStats {
  totalFields: number;
  consumerVisible: number;
  customsVisible: number;
  bothVisible: number;
  noneVisible: number;
}

interface FieldChange {
  field: string;
  category: string;
  label: string;
  level: 'consumer' | 'customs';
  from: boolean;
  to: boolean;
}

interface RightPanelProps {
  stats: VisibilityStats;
  changes: FieldChange[];
  onRevertChange: (change: FieldChange) => void;
}

export function RightPanel({ stats, changes, onRevertChange }: RightPanelProps) {
  const { t } = useTranslation('dpp');

  return (
    <div className="w-[300px] border-l bg-muted/10">
      <Tabs defaultValue="stats" className="h-full flex flex-col">
        <TabsList className="w-full rounded-none border-b">
          <TabsTrigger value="stats" className="flex-1">
            {t('Stats')}
          </TabsTrigger>
          <TabsTrigger value="changes" className="flex-1">
            {t('Changes')} {changes.length > 0 && `(${changes.length})`}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="stats" className="p-4 flex-1 overflow-auto">
          <StatsCard stats={stats} />
        </TabsContent>

        <TabsContent value="changes" className="p-4 flex-1 overflow-auto">
          <ChangesTracker changes={changes} onRevert={onRevertChange} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
