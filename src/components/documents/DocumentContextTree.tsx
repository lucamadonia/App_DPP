import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

interface TreeNode {
  id: string;
  name: string;
  count: number;
}

interface DocumentContextTreeProps {
  label: string;
  icon: React.ReactNode;
  nodes: TreeNode[];
  selectedId?: string;
  onSelect: (id: string) => void;
  renderAction?: (node: TreeNode) => React.ReactNode;
}

export function DocumentContextTree({
  label,
  icon,
  nodes,
  selectedId,
  onSelect,
  renderAction,
}: DocumentContextTreeProps) {
  const [open, setOpen] = useState(true);

  if (nodes.length === 0) return null;

  const totalCount = nodes.reduce((sum, n) => sum + n.count, 0);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors">
        <ChevronRight
          className={cn(
            'h-3.5 w-3.5 shrink-0 transition-transform duration-200',
            open && 'rotate-90'
          )}
        />
        {icon}
        <span className="truncate flex-1 text-left">{label}</span>
        <Badge variant="secondary" className="h-5 min-w-[20px] px-1.5 text-[10px] font-medium">
          {totalCount}
        </Badge>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="ml-3.5 mt-0.5 space-y-0.5 border-l pl-2.5">
          {nodes.map((node) => (
            <div
              key={node.id}
              className={cn(
                'group flex w-full items-center gap-1 rounded-md px-2 py-1 text-sm transition-colors cursor-pointer',
                selectedId === node.id
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
              )}
              onClick={() => onSelect(node.id)}
            >
              <span className="truncate flex-1 text-left">{node.name}</span>
              {renderAction && renderAction(node)}
              <Badge variant="secondary" className="h-4.5 min-w-[18px] px-1 text-[10px] shrink-0">
                {node.count}
              </Badge>
            </div>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
