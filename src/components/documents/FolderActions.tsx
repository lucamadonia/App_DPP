import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FolderPlus, Pencil, Trash2, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface FolderActionsProps {
  onCreateFolder: (name: string) => void;
  isCreating?: boolean;
}

export function CreateFolderButton({ onCreateFolder, isCreating }: FolderActionsProps) {
  const { t } = useTranslation('documents');
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
    }
  }, [isEditing]);

  function handleSubmit() {
    const trimmed = name.trim();
    if (trimmed) {
      onCreateFolder(trimmed);
      setName('');
      setIsEditing(false);
    }
  }

  if (isEditing) {
    return (
      <div className="px-2 py-1">
        <Input
          ref={inputRef}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSubmit();
            if (e.key === 'Escape') { setIsEditing(false); setName(''); }
          }}
          onBlur={() => {
            if (!name.trim()) { setIsEditing(false); setName(''); }
          }}
          placeholder={t('Folder Name')}
          className="h-7 text-sm"
          disabled={isCreating}
        />
      </div>
    );
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className="w-full justify-start gap-2 text-muted-foreground text-sm h-8"
      onClick={() => setIsEditing(true)}
    >
      <FolderPlus className="h-3.5 w-3.5" />
      {t('New Folder')}
    </Button>
  );
}

interface FolderKebabMenuProps {
  folderId: string;
  folderName: string;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
}

export function FolderKebabMenu({ folderId, folderName, onRename, onDelete }: FolderKebabMenuProps) {
  const { t } = useTranslation('documents');
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(folderName);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isRenaming) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isRenaming]);

  if (isRenaming) {
    return (
      <Input
        ref={inputRef}
        value={newName}
        onChange={(e) => setNewName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            const trimmed = newName.trim();
            if (trimmed && trimmed !== folderName) {
              onRename(folderId, trimmed);
            }
            setIsRenaming(false);
          }
          if (e.key === 'Escape') {
            setNewName(folderName);
            setIsRenaming(false);
          }
        }}
        onBlur={() => {
          setNewName(folderName);
          setIsRenaming(false);
        }}
        className="h-6 text-sm px-1"
      />
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreHorizontal className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setIsRenaming(true); }}>
            <Pencil className="mr-2 h-3.5 w-3.5" />
            {t('Rename Folder')}
          </DropdownMenuItem>
          <DropdownMenuItem
            className="text-destructive"
            onClick={(e) => { e.stopPropagation(); setShowDeleteAlert(true); }}
          >
            <Trash2 className="mr-2 h-3.5 w-3.5" />
            {t('Delete Folder')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('Delete folder?')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('Documents in this folder will not be deleted.')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('Cancel', { ns: 'common' })}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => onDelete(folderId)}
            >
              {t('Delete', { ns: 'common' })}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
