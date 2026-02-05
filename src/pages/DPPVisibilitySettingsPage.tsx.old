import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Eye,
  Save,
  RotateCcw,
  Info,
  Users,
  ShieldCheck,
  Check,
  Lock,
  ExternalLink,
  Loader2,
  Cloud,
  CloudOff,
  Database,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  type VisibilityConfigV2,
  type VisibilityLevel,
  defaultVisibilityConfigV2,
  fieldDefinitions,
  fieldCategories,
  visibilityLevels,
} from '@/types/visibility';
import { getVisibilitySettings, saveVisibilitySettings } from '@/services/supabase';

// Icons für Sichtbarkeitsstufen
const levelIcons: Record<VisibilityLevel, React.ReactNode> = {
  internal: <Lock className="h-4 w-4" />,
  customs: <ShieldCheck className="h-4 w-4" />,
  consumer: <Users className="h-4 w-4" />,
};

const levelColors: Record<VisibilityLevel, string> = {
  internal: 'bg-slate-500',
  customs: 'bg-amber-500',
  consumer: 'bg-green-500',
};

const levelBgColors: Record<VisibilityLevel, string> = {
  internal: 'bg-slate-50 dark:bg-slate-950/20 border-slate-200 dark:border-slate-800',
  customs: 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800',
  consumer: 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800',
};

export function DPPVisibilitySettingsPage() {
  const { t } = useTranslation('dpp');
  const [config, setConfig] = useState<VisibilityConfigV2>(defaultVisibilityConfigV2);
  const [saved, setSaved] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [loading, setLoading] = useState(true);
  const [apiStatus, setApiStatus] = useState<'online' | 'offline' | 'unknown'>('unknown');

  // Lade gespeicherte Konfiguration von API
  useEffect(() => {
    async function loadConfig() {
      setLoading(true);
      try {
        const savedConfig = await getVisibilitySettings();
        setConfig(savedConfig);
        setApiStatus('online');
      } catch {
        setApiStatus('offline');
      } finally {
        setLoading(false);
      }
    }
    loadConfig();
  }, []);

  // Ändere Sichtbarkeitsstufe für ein Feld
  const setFieldLevel = (field: string, level: VisibilityLevel) => {
    setConfig((prev) => ({
      ...prev,
      fields: {
        ...prev.fields,
        [field]: level,
      },
    }));
    setHasChanges(true);
    setSaved(false);
  };

  // Alle Felder einer Kategorie auf eine Stufe setzen
  const setCategoryLevel = (category: string, level: VisibilityLevel) => {
    const fieldsInCategory = fieldDefinitions
      .filter((f) => f.category === category)
      .map((f) => f.key);

    setConfig((prev) => ({
      ...prev,
      fields: {
        ...prev.fields,
        ...Object.fromEntries(fieldsInCategory.map((f) => [f, level])),
      },
    }));
    setHasChanges(true);
    setSaved(false);
  };

  // Speichern (async mit Supabase)
  const handleSave = async () => {
    const result = await saveVisibilitySettings(config);
    setSaved(true);
    setHasChanges(false);
    setApiStatus(result.success ? 'online' : 'offline');
    setTimeout(() => setSaved(false), 3000);
  };

  // Zurücksetzen auf Standard
  const handleReset = () => {
    setConfig(defaultVisibilityConfigV2);
    setHasChanges(true);
    setSaved(false);
  };

  // Zähle Felder pro Stufe
  const countByLevel = (level: VisibilityLevel) => {
    return Object.values(config.fields).filter((l) => l === level).length;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('DPP Visibility Settings')}</h1>
          <p className="text-muted-foreground">
            {t('Define which information is visible to whom')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* API Status Anzeige */}
          <Badge variant={apiStatus === 'online' ? 'default' : 'secondary'} className="flex items-center gap-1">
            {apiStatus === 'online' ? (
              <>
                <Cloud className="h-3 w-3" />
                {t('Database')}
              </>
            ) : apiStatus === 'offline' ? (
              <>
                <CloudOff className="h-3 w-3" />
                {t('Local')}
              </>
            ) : (
              <>
                <Database className="h-3 w-3" />
                ...
              </>
            )}
          </Badge>
          <Button variant="outline" onClick={handleReset}>
            <RotateCcw className="mr-2 h-4 w-4" />
            {t('Reset', { ns: 'common' })}
          </Button>
          <Button onClick={handleSave} disabled={!hasChanges || loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('Loading...', { ns: 'common' })}
              </>
            ) : saved ? (
              <>
                <Check className="mr-2 h-4 w-4" />
                {t('Saved', { ns: 'common' })}
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                {t('Save', { ns: 'common' })}
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Legende */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Info className="h-5 w-5" />
            {t('Visibility Levels')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {visibilityLevels.map((level) => (
              <div
                key={level.value}
                className={`p-4 rounded-lg border ${levelBgColors[level.value]}`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-8 h-8 rounded-full ${levelColors[level.value]} text-white flex items-center justify-center`}>
                    {levelIcons[level.value]}
                  </div>
                  <span className="font-semibold">{level.label}</span>
                  <Badge variant="outline" className="ml-auto">
                    {countByLevel(level.value)}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{level.description}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Hierarchie-Erklärung */}
      <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-start gap-4">
            <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
            <div className="space-y-2">
              <p className="font-medium text-blue-800 dark:text-blue-200">
                {t('How does visibility work?')}
              </p>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                {t('Visibility is structured hierarchically. Higher levels always see everything from the lower levels.')}
              </p>
            </div>
          </div>

          {/* Visuelle Hierarchie */}
          <div className="flex flex-col items-center gap-2 py-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700 w-full max-w-md">
              <Users className="h-5 w-5 text-green-600" />
              <div className="flex-1">
                <p className="font-medium text-green-800 dark:text-green-200">{t('Consumer')}</p>
                <p className="text-xs text-green-600 dark:text-green-400">{t('Everyone sees this field (Consumer + Customs + Admin)')}</p>
              </div>
            </div>
            <div className="h-4 w-0.5 bg-blue-300 dark:bg-blue-600" />
            <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-100 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700 w-full max-w-md">
              <ShieldCheck className="h-5 w-5 text-amber-600" />
              <div className="flex-1">
                <p className="font-medium text-amber-800 dark:text-amber-200">{t('Customs')}</p>
                <p className="text-xs text-amber-600 dark:text-amber-400">{t('Only Customs + Admin see this field')}</p>
              </div>
            </div>
            <div className="h-4 w-0.5 bg-blue-300 dark:bg-blue-600" />
            <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-100 dark:bg-slate-900/30 border border-slate-300 dark:border-slate-700 w-full max-w-md">
              <Lock className="h-5 w-5 text-slate-600" />
              <div className="flex-1">
                <p className="font-medium text-slate-800 dark:text-slate-200">{t('Internal Only')}</p>
                <p className="text-xs text-slate-600 dark:text-slate-400">{t('Only Admin sees this field (not public)')}</p>
              </div>
            </div>
          </div>

          {/* Tabelle */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-blue-200 dark:border-blue-700">
                  <th className="text-left py-2 px-3 text-blue-800 dark:text-blue-200">{t('You select')}</th>
                  <th className="text-center py-2 px-3 text-blue-800 dark:text-blue-200">{t('Consumer sees')}</th>
                  <th className="text-center py-2 px-3 text-blue-800 dark:text-blue-200">{t('Customs sees')}</th>
                  <th className="text-center py-2 px-3 text-blue-800 dark:text-blue-200">{t('Admin sees')}</th>
                </tr>
              </thead>
              <tbody className="text-blue-700 dark:text-blue-300">
                <tr className="border-b border-blue-100 dark:border-blue-800">
                  <td className="py-2 px-3 flex items-center gap-2">
                    <Users className="h-4 w-4 text-green-500" /> {t('Consumer')}
                  </td>
                  <td className="py-2 px-3 text-center text-green-600">✓</td>
                  <td className="py-2 px-3 text-center text-green-600">✓</td>
                  <td className="py-2 px-3 text-center text-green-600">✓</td>
                </tr>
                <tr className="border-b border-blue-100 dark:border-blue-800">
                  <td className="py-2 px-3 flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-amber-500" /> {t('Customs')}
                  </td>
                  <td className="py-2 px-3 text-center text-red-500">✗</td>
                  <td className="py-2 px-3 text-center text-green-600">✓</td>
                  <td className="py-2 px-3 text-center text-green-600">✓</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 flex items-center gap-2">
                    <Lock className="h-4 w-4 text-slate-500" /> {t('Internal Only')}
                  </td>
                  <td className="py-2 px-3 text-center text-red-500">✗</td>
                  <td className="py-2 px-3 text-center text-red-500">✗</td>
                  <td className="py-2 px-3 text-center text-green-600">✓</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Feldeinstellungen nach Kategorie */}
      <div className="space-y-6">
        {fieldCategories.map((category) => {
          const fieldsInCategory = fieldDefinitions.filter((f) => f.category === category);

          return (
            <Card key={category}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">{category}</CardTitle>
                    <CardDescription>
                      {t('{{count}} fields in this category', { count: fieldsInCategory.length })}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">{t('Set all to:')}</span>
                    <div className="flex gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCategoryLevel(category, 'consumer')}
                        className="h-8"
                        title="Set all visible to Consumer"
                      >
                        <Users className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCategoryLevel(category, 'customs')}
                        className="h-8"
                        title="Set all visible to Customs only"
                      >
                        <ShieldCheck className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCategoryLevel(category, 'internal')}
                        className="h-8"
                        title="Set all to Internal Only"
                      >
                        <Lock className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {fieldsInCategory.map((field) => {
                    const currentLevel = config.fields[field.key] || 'internal';

                    return (
                      <div
                        key={field.key}
                        className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${levelBgColors[currentLevel]}`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-10 h-10 rounded-full ${levelColors[currentLevel]} text-white flex items-center justify-center`}
                          >
                            {levelIcons[currentLevel]}
                          </div>
                          <div>
                            <Label className="font-medium">{field.label}</Label>
                            {field.description && (
                              <p className="text-xs text-muted-foreground">{field.description}</p>
                            )}
                          </div>
                        </div>
                        <Select
                          value={currentLevel}
                          onValueChange={(value: VisibilityLevel) => setFieldLevel(field.key, value)}
                        >
                          <SelectTrigger className="w-[180px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {visibilityLevels.map((level) => (
                              <SelectItem key={level.value} value={level.value}>
                                <div className="flex items-center gap-2">
                                  {levelIcons[level.value]}
                                  <span>{level.label}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Vorschau-Links */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            {t('Preview')}
          </CardTitle>
          <CardDescription>
            {t('Test the public pages with current settings')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <a
              href="/p/4012345678901/GSP-2024-001234"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div>
                <p className="font-medium flex items-center gap-2">
                  <Users className="h-4 w-4 text-green-600" />
                  {t('Customer View')}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t('Shows {{count}} fields', { count: countByLevel('consumer') })}
                </p>
              </div>
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
            </a>
            <a
              href="/p/4012345678901/GSP-2024-001234/customs"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div>
                <p className="font-medium flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-amber-600" />
                  {t('Customs View')}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t('Shows {{count}} fields', { count: countByLevel('consumer') + countByLevel('customs') })}
                </p>
              </div>
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
            </a>
          </div>
          <p className="text-xs text-muted-foreground text-center">
            <Lock className="h-3 w-3 inline mr-1" />
            {t('{{count}} fields are internal only and not shown on any public page', { count: countByLevel('internal') })}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
