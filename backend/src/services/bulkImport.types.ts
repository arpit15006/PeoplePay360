/**
 * Shared contract for every bulk CSV import.
 *
 * The shape mirrors the importer's central promise: an import is never
 * all-or-nothing. Rows that pass every check are written; rows that fail come
 * back as `Row N: reason` strings so the operator can fix those lines and
 * re-upload only them. A file of 1,000 employees with three bad phone numbers
 * imports 997 people, not zero.
 */
export interface BulkImportResult<T> {
  imported: T[];
  errors: string[];
}

/**
 * Rows arrive already shaped by the browser, but nothing the browser says is
 * trusted — the client validation exists for fast feedback, and every rule it
 * applies is applied again here against live data. `rowNumber` is the 1-based
 * line in the operator's spreadsheet (header excluded), carried through so a
 * server-side rejection points at the same line the client would have.
 */
export function rowError(rowNumber: number, message: string): string {
  return `Row ${rowNumber}: ${message}`;
}

/** Case- and whitespace-insensitive lookup key for matching names to records. */
export function lookupKey(value: string | null | undefined): string {
  return String(value ?? '').trim().toLowerCase();
}

/**
 * A random temporary password. Deliberately not `password123`: a bulk import
 * mints accounts by the hundred, and one shared known password across a whole
 * roster is a standing invitation.
 */
export function generateTempPassword(): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // no I/O — misread on printouts
  const lower = 'abcdefghijkmnopqrstuvwxyz';
  const digits = '23456789';
  const symbols = '@#$%&*';
  const all = upper + lower + digits + symbols;

  const pick = (set: string) => set[Math.floor(Math.random() * set.length)];

  // One of each class up front guarantees the result satisfies any policy that
  // demands a mix, then fill to length and shuffle so the classes are not
  // always in the same positions.
  const chars = [pick(upper), pick(lower), pick(digits), pick(symbols)];
  while (chars.length < 12) chars.push(pick(all));

  for (let i = chars.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}
