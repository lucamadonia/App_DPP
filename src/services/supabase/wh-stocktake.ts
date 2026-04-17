/**
 * Warehouse Stocktake Service
 *
 * Commits a stocktake session as a series of stock adjustments and/or
 * new goods receipts. Reuses existing wh-stock primitives; no new tables.
 *
 * Each stocktake maps to N transactions in wh_stock_transactions with
 * type='adjustment' and a shared reason prefix so they can be grouped
 * later for reporting.
 */

import { createStockAdjustment, createGoodsReceipt } from './wh-stock';

export interface StocktakeLine {
  stockId?: string;
  locationId: string;
  productId: string;
  batchId: string;
  expected: number;
  counted: number;
  productName?: string;
  batchSerial?: string;
}

export interface StocktakeCommitResult {
  adjustmentsPosted: number;
  receiptsPosted: number;
  failures: Array<{ line: StocktakeLine; error: string }>;
}

export interface CommitStocktakeParams {
  lines: StocktakeLine[];
  reason: string;
}

/**
 * Commit a stocktake session.
 *
 * - Line with existing stockId and variance != 0 → createStockAdjustment
 * - Line without stockId (counted a batch not in the expected list) → createGoodsReceipt
 * - Line with variance === 0 → skipped
 *
 * Errors on individual lines do not abort the rest; they are returned in `failures`.
 */
export async function commitStocktake(params: CommitStocktakeParams): Promise<StocktakeCommitResult> {
  const result: StocktakeCommitResult = {
    adjustmentsPosted: 0,
    receiptsPosted: 0,
    failures: [],
  };

  for (const line of params.lines) {
    const variance = line.counted - line.expected;

    if (variance === 0) continue;

    try {
      if (line.stockId) {
        await createStockAdjustment({
          stockId: line.stockId,
          quantityChange: variance,
          reason: `Stocktake: ${params.reason}`,
        });
        result.adjustmentsPosted += 1;
      } else if (line.counted > 0) {
        await createGoodsReceipt({
          locationId: line.locationId,
          productId: line.productId,
          batchId: line.batchId,
          quantity: line.counted,
          notes: `Stocktake: ${params.reason}`,
        });
        result.receiptsPosted += 1;
      }
    } catch (err) {
      result.failures.push({
        line,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return result;
}
