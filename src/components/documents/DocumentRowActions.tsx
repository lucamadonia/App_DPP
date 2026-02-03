import { useTranslation } from 'react-i18next';
import { Eye, Download, Pencil, Trash2, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Document } from '@/services/supabase';

interface DocumentRowActionsProps {
  doc: Document;
  onPreview: (doc: Document) => void;
  onDownload: (doc: Document) => void;
  onEdit: (doc: Document) => void;
  onDelete: (doc: Document) => void;
}

export function DocumentRowActions({ doc, onPreview, onDownload, onEdit, onDelete }: DocumentRowActionsProps) {
  const { t } = useTranslation('documents');

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onPreview(doc)}>
          <Eye className="mr-2 h-4 w-4" />
          {t('Preview')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onDownload(doc)} disabled={!doc.storagePath}>
          <Download className="mr-2 h-4 w-4" />
          {t('Download', { ns: 'common' })}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onEdit(doc)}>
          <Pencil className="mr-2 h-4 w-4" />
          {t('Edit Details')}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-destructive" onClick={() => onDelete(doc)}>
          <Trash2 className="mr-2 h-4 w-4" />
          {t('Delete', { ns: 'common' })}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
