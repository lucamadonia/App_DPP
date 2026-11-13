import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { BarChart3 } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/adaptive-dialog';
import {
  FormActions, FormField, FormGrid, FormSection, InputAffix, OptionalDisclosure,
} from '@/components/ui/form-layout';
import { createContentPost, updateContentPost } from '@/services/supabase/wh-content';
import type { WhContentPost, WhContentPostInput, SocialPlatform } from '@/types/warehouse';

interface ContentPostFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shipmentId: string;
  campaignId?: string;
  contactId?: string;
  editing?: WhContentPost | null;
  onSaved: () => void;
}

export function ContentPostForm({ open, onOpenChange, shipmentId, campaignId, contactId, editing, onSaved }: ContentPostFormProps) {
  const { t } = useTranslation('warehouse');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Partial<WhContentPostInput>>({
    platform: editing?.platform || 'instagram',
    postUrl: editing?.postUrl || '',
    postedAt: editing?.postedAt ? editing.postedAt.slice(0, 10) : '',
    views: editing?.views,
    likes: editing?.likes,
    comments: editing?.comments,
    engagementRate: editing?.engagementRate,
    notes: editing?.notes,
  });

  const handleSave = async () => {
    if (!form.postUrl || !form.platform) return;
    setSaving(true);
    try {
      if (editing) {
        await updateContentPost(editing.id, form);
        toast.success(t('Content post updated'));
      } else {
        await createContentPost({
          shipmentId,
          campaignId,
          contactId,
          platform: form.platform as SocialPlatform,
          postUrl: form.postUrl,
          postedAt: form.postedAt || undefined,
          views: form.views,
          likes: form.likes,
          comments: form.comments,
          engagementRate: form.engagementRate,
          notes: form.notes,
        });
        toast.success(t('Content post added'));
      }
      onOpenChange(false);
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto pb-0">
        <DialogHeader>
          <DialogTitle>{editing ? t('Edit Content Post') : t('Add Content Post')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-5">
          <FormGrid cols={2}>
            <FormField label={t('Post URL')} htmlFor="post-url" required span="full">
              <Input
                id="post-url"
                type="url"
                inputMode="url"
                autoCapitalize="none"
                placeholder="https://instagram.com/p/..."
                value={form.postUrl || ''}
                onChange={(e) => setForm({ ...form, postUrl: e.target.value })}
              />
            </FormField>
            <FormField label={t('Primary Platform')} htmlFor="post-platform">
              <Select
                value={form.platform || 'instagram'}
                onValueChange={(v) => setForm({ ...form, platform: v as SocialPlatform })}
              >
                <SelectTrigger id="post-platform" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(['instagram', 'tiktok', 'youtube', 'twitter', 'pinterest', 'other'] as SocialPlatform[]).map((p) => (
                    <SelectItem key={p} value={p}>{t(p)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label={t('Posted At')} htmlFor="post-date" optional>
              <Input
                id="post-date"
                type="date"
                value={form.postedAt || ''}
                onChange={(e) => setForm({ ...form, postedAt: e.target.value })}
              />
            </FormField>
          </FormGrid>

          <FormSection title={t('Performance')} icon={BarChart3} variant="plain" layout="stacked">
            <FormGrid cols={4}>
              <FormField label={t('Views')} htmlFor="post-views" optional>
                <Input
                  id="post-views"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={form.views ?? ''}
                  onChange={(e) => setForm({ ...form, views: e.target.value ? Number(e.target.value) : undefined })}
                />
              </FormField>
              <FormField label={t('Likes')} htmlFor="post-likes" optional>
                <Input
                  id="post-likes"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={form.likes ?? ''}
                  onChange={(e) => setForm({ ...form, likes: e.target.value ? Number(e.target.value) : undefined })}
                />
              </FormField>
              <FormField label={t('Comments')} htmlFor="post-comments" optional>
                <Input
                  id="post-comments"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={form.comments ?? ''}
                  onChange={(e) => setForm({ ...form, comments: e.target.value ? Number(e.target.value) : undefined })}
                />
              </FormField>
              <FormField label={t('Engagement Rate')} htmlFor="post-er" optional>
                <InputAffix suffix="%">
                  <Input
                    id="post-er"
                    type="number"
                    inputMode="decimal"
                    min={0}
                    max={100}
                    step={0.01}
                    value={form.engagementRate ?? ''}
                    onChange={(e) => setForm({ ...form, engagementRate: e.target.value ? Number(e.target.value) : undefined })}
                  />
                </InputAffix>
              </FormField>
            </FormGrid>
          </FormSection>

          <OptionalDisclosure
            label={t('Notes')}
            description={form.notes || undefined}
            filledCount={form.notes ? 1 : 0}
          >
            <Textarea
              aria-label={t('Notes')}
              value={form.notes || ''}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
            />
          </OptionalDisclosure>
        </div>
        <FormActions sticky="dialog">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>{t('Cancel', { ns: 'common' })}</Button>
          <Button onClick={handleSave} disabled={!form.postUrl || saving}>{t('Save', { ns: 'common' })}</Button>
        </FormActions>
      </DialogContent>
    </Dialog>
  );
}
