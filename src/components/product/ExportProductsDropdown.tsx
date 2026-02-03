import { useTranslation } from 'react-i18next';
import { Download, FileSpreadsheet, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';

interface ExportProductsDropdownProps {
  disabled?: boolean;
  includeBatches: boolean;
  onIncludeBatchesChange: (v: boolean) => void;
  onExportCSV: () => void;
  onExportPDFOverview: () => void;
  onExportPDFCatalog: () => void;
  isExporting: boolean;
}

export function ExportProductsDropdown({
  disabled,
  includeBatches,
  onIncludeBatchesChange,
  onExportCSV,
  onExportPDFOverview,
  onExportPDFCatalog,
  isExporting,
}: ExportProductsDropdownProps) {
  const { t } = useTranslation('products');

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={disabled || isExporting}>
          {isExporting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-2 h-4 w-4" />
          )}
          {isExporting ? t('Exporting...') : t('Export')}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem onClick={onExportCSV}>
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          {t('Export as CSV')}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs text-muted-foreground">PDF</DropdownMenuLabel>
        <DropdownMenuItem onClick={onExportPDFOverview}>
          <FileText className="mr-2 h-4 w-4" />
          {t('PDF Overview')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onExportPDFCatalog}>
          <FileText className="mr-2 h-4 w-4" />
          {t('PDF Catalog')}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuCheckboxItem
          checked={includeBatches}
          onCheckedChange={onIncludeBatchesChange}
        >
          {t('Include Batches')}
        </DropdownMenuCheckboxItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
