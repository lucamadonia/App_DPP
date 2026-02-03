import { useTranslation } from 'react-i18next';
import {
  Package,
  Truck,
  FolderClosed,
  FileText,
  FileQuestion,
  Search,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { DocumentContextTree } from './DocumentContextTree';
import { CreateFolderButton, FolderKebabMenu } from './FolderActions';
import type { DocumentFolder } from '@/types/database';

export interface SelectedContext {
  type: 'all' | 'product' | 'supplier' | 'folder' | 'unassigned';
  id?: string;
}

interface ContextCounts {
  products: Array<{ id: string; name: string; count: number }>;
  suppliers: Array<{ id: string; name: string; count: number }>;
  folders: Array<{ id: string; name: string; parentId?: string; count: number }>;
  unassigned: number;
}

interface DocumentSidebarProps {
  selectedContext: SelectedContext;
  onSelectContext: (ctx: SelectedContext) => void;
  contextCounts: ContextCounts;
  folders: DocumentFolder[];
  totalCount: number;
  onCreateFolder: (name: string) => void;
  onRenameFolder: (id: string, name: string) => void;
  onDeleteFolder: (id: string) => void;
  sidebarSearch: string;
  onSidebarSearchChange: (value: string) => void;
}

export function DocumentSidebar({
  selectedContext,
  onSelectContext,
  contextCounts,
  folders,
  totalCount,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  sidebarSearch,
  onSidebarSearchChange,
}: DocumentSidebarProps) {
  const { t } = useTranslation('documents');

  // Filter sidebar nodes by search
  const lowerSearch = sidebarSearch.toLowerCase();
  const filteredProducts = sidebarSearch
    ? contextCounts.products.filter((p) => p.name.toLowerCase().includes(lowerSearch))
    : contextCounts.products;
  const filteredSuppliers = sidebarSearch
    ? contextCounts.suppliers.filter((s) => s.name.toLowerCase().includes(lowerSearch))
    : contextCounts.suppliers;

  // Merge folder counts with all folders (including empty ones)
  const folderCountMap = new Map(contextCounts.folders.map((f) => [f.id, f.count]));
  const allFolderNodes = folders.map((f) => ({
    id: f.id,
    name: f.name,
    count: folderCountMap.get(f.id) || 0,
  }));
  const filteredFolders = sidebarSearch
    ? allFolderNodes.filter((f) => f.name.toLowerCase().includes(lowerSearch))
    : allFolderNodes;

  // Folder name lookup for kebab menus
  const folderNameMap = new Map(folders.map((f) => [f.id, f.name]));

  return (
    <div className="flex h-full flex-col border-r">
      {/* Sidebar search */}
      <div className="p-3 pb-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={sidebarSearch}
            onChange={(e) => onSidebarSearchChange(e.target.value)}
            placeholder={t('Search...')}
            className="h-8 pl-8 text-sm"
          />
        </div>
      </div>

      <ScrollArea className="flex-1 px-2 pb-2">
        <div className="space-y-0.5">
          {/* All Documents */}
          <button
            onClick={() => onSelectContext({ type: 'all' })}
            className={cn(
              'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
              selectedContext.type === 'all'
                ? 'bg-primary/10 text-primary font-medium'
                : 'text-foreground hover:bg-muted/50'
            )}
          >
            <FileText className="h-4 w-4 shrink-0" />
            <span className="truncate flex-1 text-left">{t('All Documents')}</span>
            <Badge variant="secondary" className="h-5 min-w-[20px] px-1.5 text-[10px] font-medium">
              {totalCount}
            </Badge>
          </button>

          {/* Products */}
          <DocumentContextTree
            label={t('Products')}
            icon={<Package className="h-3.5 w-3.5 shrink-0" />}
            nodes={filteredProducts}
            selectedId={selectedContext.type === 'product' ? selectedContext.id : undefined}
            onSelect={(id) => onSelectContext({ type: 'product', id })}
          />

          {/* Suppliers */}
          <DocumentContextTree
            label={t('Suppliers')}
            icon={<Truck className="h-3.5 w-3.5 shrink-0" />}
            nodes={filteredSuppliers}
            selectedId={selectedContext.type === 'supplier' ? selectedContext.id : undefined}
            onSelect={(id) => onSelectContext({ type: 'supplier', id })}
          />

          {/* Folders */}
          {(filteredFolders.length > 0 || (!sidebarSearch && folders.length === 0)) && (
            <DocumentContextTree
              label={t('Folders')}
              icon={<FolderClosed className="h-3.5 w-3.5 shrink-0" />}
              nodes={filteredFolders}
              selectedId={selectedContext.type === 'folder' ? selectedContext.id : undefined}
              onSelect={(id) => onSelectContext({ type: 'folder', id })}
              renderAction={(node) => (
                <FolderKebabMenu
                  folderId={node.id}
                  folderName={folderNameMap.get(node.id) || node.name}
                  onRename={onRenameFolder}
                  onDelete={onDeleteFolder}
                />
              )}
            />
          )}

          <div className="my-1 border-t" />

          {/* Unassigned */}
          <button
            onClick={() => onSelectContext({ type: 'unassigned' })}
            className={cn(
              'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
              selectedContext.type === 'unassigned'
                ? 'bg-primary/10 text-primary font-medium'
                : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
            )}
          >
            <FileQuestion className="h-4 w-4 shrink-0" />
            <span className="truncate flex-1 text-left">{t('Unassigned')}</span>
            <Badge variant="secondary" className="h-5 min-w-[20px] px-1.5 text-[10px] font-medium">
              {contextCounts.unassigned}
            </Badge>
          </button>
        </div>
      </ScrollArea>

      {/* Create folder button */}
      <div className="border-t p-2">
        <CreateFolderButton onCreateFolder={onCreateFolder} />
      </div>
    </div>
  );
}
