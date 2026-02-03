import { useTranslation } from 'react-i18next';
import type { MasterLabelData } from '@/types/master-label';

interface MasterLabelPreviewProps {
  data: MasterLabelData | null;
}

export function MasterLabelPreview({ data }: MasterLabelPreviewProps) {
  const { t } = useTranslation('products');

  if (!data) {
    return (
      <div className="w-[280px] h-[396px] bg-muted/50 rounded-lg border-2 border-dashed border-muted-foreground/20 flex items-center justify-center">
        <p className="text-sm text-muted-foreground">{t('ml.selectBatchForPreview')}</p>
      </div>
    );
  }

  const visibleCompliance = data.compliance.filter(c => c.present || c.mandatory);
  const hasB2bExtras = data.variant === 'b2b' && (data.b2bQuantity != null || data.b2bGrossWeight != null);

  return (
    <div className="w-[280px] h-[396px] bg-white border border-gray-300 rounded shadow-sm p-3.5 flex flex-col text-black overflow-hidden" style={{ fontSize: '8px', lineHeight: 1.35 }}>
      {/* Section 1: Identity */}
      <div className="pb-2 mb-2 border-b border-gray-300">
        <div className="text-[6px] font-bold text-gray-500 uppercase tracking-wider mb-1">
          Identity & Traceability
        </div>
        <div className="text-[11px] font-bold mb-1 leading-tight truncate">
          {data.identity.productName}
        </div>

        <div className="grid grid-cols-[65px_1fr] gap-y-0.5 text-[7px]">
          <span className="text-gray-500">Model/SKU</span>
          <span className="font-semibold font-mono truncate">{data.identity.modelSku}</span>

          {data.identity.batchNumber && (
            <>
              <span className="text-gray-500">Batch</span>
              <span className="font-semibold">{data.identity.batchNumber}</span>
            </>
          )}

          <span className="text-gray-500">Manufacturer</span>
          <div>
            <span className="font-semibold">{data.identity.manufacturer.name}</span>
            {data.identity.manufacturer.address && (
              <div className="text-[6px] text-gray-600 truncate">{data.identity.manufacturer.address}</div>
            )}
          </div>

          {data.identity.importer && (
            <>
              <span className="text-gray-500">EU Importer</span>
              <div>
                <span className="font-semibold">{data.identity.importer.name}</span>
                {data.identity.importer.address && (
                  <div className="text-[6px] text-gray-600 truncate">{data.identity.importer.address}</div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Section 2: DPP QR */}
      <div className="pb-2 mb-2 border-b border-gray-300">
        <div className="text-[6px] font-bold text-gray-500 uppercase tracking-wider mb-1">
          Digital Product Passport
        </div>
        <div className="flex items-center gap-2">
          {data.dppQr.qrDataUrl && (
            <img
              src={data.dppQr.qrDataUrl}
              alt="DPP QR"
              className="w-[52px] h-[52px] border border-gray-200"
            />
          )}
          <div className="flex-1 min-w-0">
            <div className="text-[7px] font-bold mb-0.5">{data.dppQr.labelText}</div>
            <div className="text-[5px] text-gray-500 break-all">{data.dppQr.dppUrl}</div>
          </div>
        </div>
      </div>

      {/* Section 3: Compliance */}
      {visibleCompliance.length > 0 && (
        <div className="pb-2 mb-2 border-b border-gray-300">
          <div className="text-[6px] font-bold text-gray-500 uppercase tracking-wider mb-1">
            Compliance
          </div>
          <div className="flex flex-wrap gap-1">
            {visibleCompliance.map((icon) => (
              <div
                key={icon.id}
                className={`px-1 py-0.5 border rounded text-[7px] font-bold min-w-[22px] text-center ${
                  icon.present
                    ? 'border-black text-black'
                    : 'border-gray-300 text-gray-300 bg-gray-50'
                }`}
              >
                {icon.symbol}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section 4: Sustainability */}
      <div className="flex-1 min-h-0">
        <div className="text-[6px] font-bold text-gray-500 uppercase tracking-wider mb-1">
          Sustainability & Disposal
        </div>

        {data.sustainability.packagingMaterialCodes.length > 0 && (
          <div className="flex flex-wrap gap-0.5 mb-1">
            {data.sustainability.packagingMaterialCodes.map((code, i) => (
              <span
                key={i}
                className="px-1 py-0.5 border border-gray-400 rounded-sm text-[6px]"
              >
                {code}
              </span>
            ))}
          </div>
        )}

        {data.sustainability.recyclingInstructions && (
          <div className="text-[6px] text-gray-700 mb-1 line-clamp-2">
            {data.sustainability.recyclingInstructions}
          </div>
        )}

        {data.sustainability.volumeOptimized && (
          <div className="text-[6px] text-gray-600">Package optimized for volume.</div>
        )}

        {/* B2B extras */}
        {hasB2bExtras && (
          <div className="flex gap-3 mt-1.5 pt-1.5 border-t border-gray-200 text-[6.5px]">
            {data.b2bQuantity != null && (
              <span>
                <span className="text-gray-500">Qty: </span>
                <span className="font-bold">{data.b2bQuantity} Units</span>
              </span>
            )}
            {data.b2bGrossWeight != null && (
              <span>
                <span className="text-gray-500">Gross: </span>
                <span className="font-bold">{(data.b2bGrossWeight / 1000).toFixed(2)} kg</span>
              </span>
            )}
          </div>
        )}

        {/* B2C disposal hint */}
        {data.variant === 'b2c' && data.b2cDisposalHint && (
          <div className="mt-1.5 p-1 bg-green-50 rounded text-[6px] text-green-800 line-clamp-3">
            {data.b2cDisposalHint}
          </div>
        )}
      </div>
    </div>
  );
}
