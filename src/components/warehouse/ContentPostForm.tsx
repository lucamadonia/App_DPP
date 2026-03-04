import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
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
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-sm sm:text-base">{editing ? t('Edit Content Post') : t('Add Content Post')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 sm:space-y-4">
          <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{t('Primary Platform')}</Label>
              <Select
                value={form.platform || 'instagram'}
                onValueChange={(v) => setForm({ ...form, platform: v as SocialPlatform })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(['instagram', 'tiktok', 'youtube', 'twitter', 'pinterest', 'other'] as SocialPlatform[]).map((p) => (
                    <SelectItem key={p} value={p}>{t(p)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('Posted At')}</Label>
              <Input
                type="date"
                value={form.postedAt || ''}
                onChange={(e) => setForm({ ...form, postedAt: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>{t('Post URL')}</Label>
            <Input
              placeholder="https://instagram.com/p/..."
              value={form.postUrl || ''}
              onChange={(e) => setForm({ ...form, postUrl: e.target.value })}
            />
          </div>
          <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>{t('Views')}</Label>
              <Input
                type="number"
                min={0}
                value={form.views ?? ''}
                onChange={(e) => setForm({ ...form, views: e.target.value ? Number(e.target.value) : undefined })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('Likes')}</Label>
              <Input
                type="number"
                min={0}
                value={form.likes ?? ''}
                onChange={(e) => setForm({ ...form, likes: e.target.value ? Number(e.target.value) : undefined })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('Comments')}</Label>
              <Input
                type="number"
                min={0}
                value={form.comments ?? ''}
                onChange={(e) => setForm({ ...form, comments: e.target.value ? Number(e.target.value) : undefined })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>{t('Engagement Rate')} (%)</Label>
            <Input
              type="number"
              min={0}
              max={100}
              step={0.01}
              value={form.engagementRate ?? ''}
              onChange={(e) => setForm({ ...form, engagementRate: e.target.value ? Number(e.target.value) : undefined })}
            />
          </div>
          <div className="space-y-2">
            <Label>{t('Notes')}</Label>
            <Textarea
              value={form.notes || ''}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
            />
          </div>
        </div>
        <DialogFooter className="flex-col-reverse sm:flex-row gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t('Cancel', { ns: 'common' })}</Button>
          <Button onClick={handleSave} disabled={!form.postUrl || saving}>{t('Save', { ns: 'common' })}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
