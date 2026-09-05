/**
 * CSV reading and writing for the bulk importers.
 *
 * Deliberately hand-rolled rather than pulled from a library: the format the
 * importers accept is narrow, and the rules that matter here — quoted cells,
 * BOM-prefixed output so Excel opens accents correctly — are few enough to
 * state plainly and test by reading.
 */

/**
 * Splits one CSV line into cells, honouring double-quoted values.
 *
 * Handles the three cases a spreadsheet actually emits: a comma inside quotes
 * ("Patel, Priya"), an escaped quote inside quotes (""), and a bare cell.
 */
export function splitCsvLine(line: string): string[] {
  const cells: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      cells.push(current)
      current = ''
    } else {
      current += char
    }
  }
  cells.push(current)

  return cells.map(cell => cell.trim())
}

export interface ParsedCsv {
  /** Header names, lower-cased, in file order. */
  headers: string[]
  /** One entry per data row: the cells, plus the line number in the file. */
  rows: { cells: string[]; lineNumber: number }[]
}

/**
 * Parses a whole CSV document.
 *
 * Strips a UTF-8 BOM (Excel writes one, and it would otherwise become part of
 * the first header name), accepts CRLF or LF, and drops blank lines — a
 * trailing newline is not an empty final row.
 *
 * `lineNumber` counts from 1 at the header, so a reported "Row 5" is the line
 * the operator sees selected in their spreadsheet.
 */
export function parseCsv(text: string): ParsedCsv {
  const withoutBom = text.replace(/^﻿/, '')

  const lines = withoutBom
    .split(/\r?\n/)
    .map((line, index) => ({ line, lineNumber: index + 1 }))
    .filter(entry => entry.line.trim().length > 0)

  if (lines.length === 0) return { headers: [], rows: [] }

  const headers = splitCsvLine(lines[0].line).map(header => header.toLowerCase())
  const rows = lines.slice(1).map(entry => ({
    cells: splitCsvLine(entry.line),
    lineNumber: entry.lineNumber
  }))

  return { headers, rows }
}

/**
 * Triggers a CSV download.
 *
 * The leading BOM tells Excel the bytes are UTF-8; without it, a name like
 * "Zoë" opens as "ZoÃ«". Every cell is quoted and inner quotes doubled, so a
 * value containing a comma survives the round trip.
 */
export function downloadCsv(fileName: string, rows: (string | number | null | undefined)[][]) {
  const content = rows
    .map(row => row.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n')

  const blob = new Blob(['﻿' + content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
