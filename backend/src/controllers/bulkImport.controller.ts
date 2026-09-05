import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { bulkImportEmployees } from '../services/employeeBulkImport.service';
import { bulkImportUsers } from '../services/userBulkImport.service';
import { bulkImportAttendance } from '../services/attendanceBulkImport.service';
import { bulkImportAllocations } from '../services/allocationBulkImport.service';
import { bulkImportContracts } from '../services/contractBulkImport.service';

/**
 * A row as it leaves the browser: the line number it came from plus whatever
 * columns the file carried, all still strings.
 *
 * The per-field rules live in the import services, not here, because they need
 * live data to check against — this only enforces the envelope. The cap exists
 * so a mis-picked file cannot ask the server to hold an unbounded array in
 * memory; 5,000 rows comfortably covers a full-headcount roster or a month of
 * attendance for 200 people, and larger jobs are split into files.
 */
const MAX_ROWS = 5000;

const importRowSchema = z
  .object({ rowNumber: z.number().int().positive() })
  .catchall(z.string().optional().nullable());

const importPayloadSchema = z.object({
  rows: z
    .array(importRowSchema)
    .min(1, 'The file has no data rows.')
    .max(MAX_ROWS, `A single import is limited to ${MAX_ROWS} rows — split the file and import it in parts.`),
});

/**
 * Lower-cases every field name on a row.
 *
 * The CSV header is the wire key, and headers are lower-cased when the file is
 * parsed, so `jobposition` is what actually arrives. Normalising here means a
 * caller that sends `jobPosition` is understood too, rather than having the
 * field read as blank and the row rejected for a reason that is not the real
 * one — which is exactly how this went wrong the first time.
 */
function normaliseKeys(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [field, value] of Object.entries(row)) {
    out[field === 'rowNumber' ? field : field.toLowerCase()] = value;
  }
  return out;
}

/** Wraps an importer so all five endpoints answer in the same shape. */
function handler<T>(
  run: (rows: any[], req: Request) => Promise<{ imported: T[]; errors: string[] }>
) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { rows } = importPayloadSchema.parse(req.body);
      const result = await run(rows.map(normaliseKeys), req);
      // 200 even when some rows failed: a partial import is a success with
      // caveats, and the caller reads `errors` to see which lines to fix.
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  };
}

export const importEmployees = handler((rows) => bulkImportEmployees(rows));
export const importUsers = handler((rows) => bulkImportUsers(rows));
export const importAttendance = handler((rows) => bulkImportAttendance(rows));
export const importAllocations = handler((rows, req) => bulkImportAllocations(rows, req.user!));
export const importContracts = handler((rows) => bulkImportContracts(rows));
