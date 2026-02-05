/**
 * DPP Visibility Settings Page V3
 *
 * Modern split-view UI with independent consumer/customs checkboxes.
 * Replaces hierarchical V2 model with flexible independent toggles.
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import type { VisibilityConfigV3, IndependentFieldVisibility } from '@/types/visibility';
import { defaultVisibilityConfigV3, fieldDefinitions } from '@/types/visibility';
import { useToast } from '@/hooks/use-toast';
import { getVisibilitySettings, saveVisibilitySettings } from '@/services/supabase/visibility';
import { HeaderToolbar } from '@/components/dpp/visibility/HeaderToolbar';
import { LeftSidebar } from '@/components/dpp/visibility/LeftSidebar';
import { MainCanvas } from '@/components/dpp/visibility/MainCanvas';
import { RightPanel } from '@/components/dpp/visibility/RightPanel';
import { ScrollArea } from '@/components/ui/scroll-area';

interface FieldChange {
  field: string;
  category: string;
  label: string;
  level: 'consumer' | 'customs';
  from: boolean;
  to: boolean;
}

interface VisibilityStats {
  totalFields: number;
  consumerVisible: number;
  customsVisible: number;
  bothVisible: number;
  noneVisible: number;
}

export function DPPVisibilitySettingsPageV3() {
  const { t } = useTranslation('dpp');
  const navigate = useNavigate();
  const { toast } = useToast();

  // State
  const [config, setConfig] = useState<VisibilityConfigV3>(defaultVisibilityConfigV3);
  const [originalConfig, setOriginalConfig] = useState<VisibilityConfigV3>(defaultVisibilityConfigV3);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(['Basic Data'])
  );

  // Load config on mount
  useEffect(() => {
    loadConfig();
  }, []);

  async function loadConfig() {
    setIsLoading(true);
    try {
      const loaded = await getVisibilitySettings();
      setConfig(loaded);
      setOriginalConfig(loaded);
    } catch (error) {
      console.error('Failed to load visibility settings:', error);
      toast({
        variant: 'destructive',
        title: t('Failed to load settings'),
      });
    } finally {
      setIsLoading(false);
    }
  }

  // Calculate changes
  const changes = useMemo((): FieldChange[] => {
    const changeList: FieldChange[] = [];

    for (const field of fieldDefinitions) {
      const original = originalConfig.fields[field.key] || { consumer: false, customs: false };
      const current = config.fields[field.key] || { consumer: false, customs: false };

      if (original.consumer !== current.consumer) {
        changeList.push({
          field: field.key,
          category: field.category,
          label: field.label,
          level: 'consumer',
          from: original.consumer,
          to: current.consumer,
        });
      }

      if (original.customs !== current.customs) {
        changeList.push({
          field: field.key,
          category: field.category,
          label: field.label,
          level: 'customs',
          from: original.customs,
          to: current.customs,
        });
      }
    }

    return changeList;
  }, [config, originalConfig]);

  const hasChanges = changes.length > 0;

  // Calculate stats
  const stats = useMemo((): VisibilityStats => {
    let consumerVisible = 0;
    let customsVisible = 0;
    let bothVisible = 0;
    let noneVisible = 0;

    for (const field of fieldDefinitions) {
      const visibility = config.fields[field.key] || { consumer: false, customs: false };

      if (visibility.consumer) consumerVisible++;
      if (visibility.customs) customsVisible++;

      if (visibility.consumer && visibility.customs) {
        bothVisible++;
      } else if (!visibility.consumer && !visibility.customs) {
        noneVisible++;
      }
    }

    return {
      totalFields: fieldDefinitions.length,
      consumerVisible,
      customsVisible,
      bothVisible,
      noneVisible,
    };
  }, [config]);

  // Handlers
  function handleFieldToggle(field: string, level: 'consumer' | 'customs', value: boolean) {
    setConfig((prev) => ({
      ...prev,
      fields: {
        ...prev.fields,
        [field]: {
          ...prev.fields[field],
          [level]: value,
        },
      },
    }));
  }

  function handleCategoryBulkToggle(
    category: string,
    level: 'consumer' | 'customs',
    value: boolean
  ) {
    const fieldsInCategory = fieldDefinitions.filter((f) => f.category === category);

    setConfig((prev) => {
      const newFields = { ...prev.fields };

      for (const field of fieldsInCategory) {
        newFields[field.key] = {
          ...newFields[field.key],
          [level]: value,
        };
      }

      return {
        ...prev,
        fields: newFields,
      };
    });
  }

  function handleBulkAction(level: 'consumer' | 'customs', value: boolean) {
    setConfig((prev) => {
      const newFields = { ...prev.fields };

      for (const field of fieldDefinitions) {
        newFields[field.key] = {
          ...newFields[field.key],
          [level]: value,
        };
      }

      return {
        ...prev,
        fields: newFields,
      };
    });
  }

  function handlePresetApply(presetId: string) {
    let newFields: Record<string, IndependentFieldVisibility>;

    switch (presetId) {
      case 'all-public':
        // Everything visible to both consumer and customs
        newFields = {};
        for (const field of fieldDefinitions) {
          newFields[field.key] = { consumer: true, customs: true };
        }
        break;

      case 'minimal-consumer':
        // Only basic data for consumer, everything for customs
        newFields = {};
        for (const field of fieldDefinitions) {
          newFields[field.key] = {
            consumer: field.category === 'Basic Data',
            customs: true,
          };
        }
        break;

      case 'full-customs':
        // Nothing for consumer, everything for customs
        newFields = {};
        for (const field of fieldDefinitions) {
          newFields[field.key] = { consumer: false, customs: true };
        }
        break;

      case 'factory-defaults':
        // Reset to defaults
        setConfig(defaultVisibilityConfigV3);
        toast({
          title: t('Applied factory defaults'),
        });
        return;

      default:
        return;
    }

    setConfig((prev) => ({
      ...prev,
      fields: newFields,
    }));

    toast({
      title: t('Applied preset'),
    });
  }

  function handleRevertChange(change: FieldChange) {
    setConfig((prev) => ({
      ...prev,
      fields: {
        ...prev.fields,
        [change.field]: {
          ...prev.fields[change.field],
          [change.level]: change.from,
        },
      },
    }));
  }

  async function handleSave() {
    setIsSaving(true);
    try {
      const result = await saveVisibilitySettings(config);
      if (result.success) {
        setOriginalConfig(config);
        toast({
          title: t('Settings saved successfully'),
        });
      } else {
        toast({
          variant: 'destructive',
          title: result.error || t('Failed to save settings'),
        });
      }
    } catch (error) {
      console.error('Failed to save visibility settings:', error);
      toast({
        variant: 'destructive',
        title: t('Failed to save settings'),
      });
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      <HeaderToolbar
        hasChanges={hasChanges}
        changeCount={changes.length}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onSave={handleSave}
        onBack={() => navigate('/dpp')}
        onPresetApply={handlePresetApply}
        isSaving={isSaving}
      />

      <div className="flex flex-1 overflow-hidden">
        <LeftSidebar onPresetApply={handlePresetApply} onBulkAction={handleBulkAction} />

        <ScrollArea className="flex-1">
          <MainCanvas
            config={config}
            searchQuery={searchQuery}
            expandedCategories={expandedCategories}
            onToggle={handleFieldToggle}
            onCategoryToggle={setExpandedCategories}
            onCategoryBulkToggle={handleCategoryBulkToggle}
          />
        </ScrollArea>

        <RightPanel stats={stats} changes={changes} onRevertChange={handleRevertChange} />
      </div>
    </div>
  );
}
