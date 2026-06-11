/**
 * Warehouse Stocktake Service
 *
 * Commits a stocktake session as a series of stock adjustments and/or
 * new goods receipts. Reuses existing wh-stock primitives; no new tables.
 *
 * Each stocktake maps to N transactions in wh_stock_transactions with
 * type='adjustment' and a shared reason prefix so they can be grouped
 * later for reporting.
 *
 * Since migration 20260502_wh_stock_per_bin a batch can have MULTIPLE
 * wh_stock_levels rows per location (one per bin). A stocktake line is
 * therefore aggregated per batch and carries all underlying stock rows
 * in `stocks[]`; the commit distributes the variance across those rows.
 */

import { createStockAdjustment, createGoodsReceipt } from './wh-stock';

export interface StocktakeLineStock {
  stockId: string;
  /** quantity_available on this row at load time (upper bound for reductions) */
  available: number;
}

export interface StocktakeLine {
  locationId: string;
  productId: string;
  batchId: string;
  /** Expected physical quantity = Σ (available + reserved) across all bins */
  expected: number;
  counted: number;
  /** Underlying per-bin stock rows for this batch (empty for unexpected batches) */
  stocks: StocktakeLineStock[];
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
 * - variance === 0 → skipped
 * - variance > 0 (surplus):
 *     - batch has stock rows → adjustment (+variance) on the first row
 *     - batch has no rows (unexpected) → goods receipt for the counted qty
 * - variance < 0 (shortage):
 *     - distributed across the batch's stock rows, capped by each row's
 *       `available` quantity, largest rows first
 *     - if the shortage cannot be fully absorbed (e.g. reserved quantities),
 *       the line fails WITHOUT posting anything — no partial reductions
 *
 * Errors on individual lines do not abort the rest; they are returned in
 * `failures` so the caller can retry only the failed lines (successful
 * lines must NOT be re-committed — that would double-book).
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
      if (variance > 0) {
        // Surplus: book onto first existing row, or receive as new stock
        if (line.stocks.length > 0) {
          await createStockAdjustment({
            stockId: line.stocks[0].stockId,
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
        continue;
      }

      // Shortage: distribute across rows, largest available first.
      let remaining = -variance;
      const sorted = [...line.stocks].sort((a, b) => b.available - a.available);

      // Pre-check BEFORE posting anything so a non-distributable shortage
      // fails atomically (no partial reductions to untangle on retry).
      const totalAvailable = sorted.reduce((s, r) => s + Math.max(0, r.available), 0);
      if (totalAvailable < remaining) {
        result.failures.push({
          line,
          error: 'Could not fully reduce stock (reserved quantities)',
        });
        continue;
      }

      for (const row of sorted) {
        if (remaining <= 0) break;
        const reduceBy = Math.min(remaining, Math.max(0, row.available));
        if (reduceBy <= 0) continue;
        await createStockAdjustment({
          stockId: row.stockId,
          quantityChange: -reduceBy,
          reason: `Stocktake: ${params.reason}`,
        });
        result.adjustmentsPosted += 1;
        remaining -= reduceBy;
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
