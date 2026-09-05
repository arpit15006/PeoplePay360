import { useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import {
  IconAlertCircle,
  IconCircleCheck,
  IconDownload,
  IconFileDownload,
  IconLoader2,
  IconUpload
} from '@tabler/icons-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { downloadCsv, parseCsv } from '@/lib/csv'
import type { ImportConfig, ImportContext, ParsedRow } from '@/components/bulk/types'

/** Rows rendered in the preview; the rest are counted, not drawn. */
const PREVIEW_LIMIT = 50
/** Rows rendered in the success table before pointing at the CSV download. */
const RESULT_LIMIT = 10
/** Matches the server's own cap, so an oversized file is caught before upload. */
const MAX_ROWS = 5000

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  config: ImportConfig
  context: ImportContext
}

/**
 * The shared bulk-import flow: template → file → preview → import → results.
 *
 * Validation happens twice on purpose. Here it is instant and specific, so the
 * operator fixes a 400-row file in their spreadsheet rather than by trial and
 * error against the server. On the server it is authoritative, because the
 * browser is not a trust boundary and because the data it validated against is
 * a snapshot that may have moved on.
 */
export function BulkImportDialog({ open, onOpenChange, config, context }: Props) {
  const [file, setFile] = useState<File | null>(null)
  const [parsed, setParsed] = useState<ParsedRow[]>([])
  const [fileErrors, setFileErrors] = useState<string[]>([])
  const [rowErrors, setRowErrors] = useState<string[]>([])
  const [serverErrors, setServerErrors] = useState<string[]>([])
  const [result, setResult] = useState<Record<string, unknown>[] | null>(null)
  const [importing, setImporting] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const reset = () => {
    setFile(null)
    setParsed([])
    setFileErrors([])
    setRowErrors([])
    setServerErrors([])
    setResult(null)
    setImporting(false)
    // The same file re-picked after an edit fires no change event unless the
    // input is cleared, which would strand the operator on a stale preview.
    if (inputRef.current) inputRef.current.value = ''
  }

  const close = () => {
    onOpenChange(false)
    reset()
  }

  const downloadTemplate = () => {
    const sampleCount = Math.max(...config.columns.map(column => column.samples.length))
    downloadCsv(`${config.templateName}_template.csv`, [
      config.columns.map(column => column.key),
      ...Array.from({ length: sampleCount }, (_, i) =>
        config.columns.map(column => column.samples[i] ?? '')
      )
    ])
  }

  const handleFile = (selected: File | undefined) => {
    if (!selected) return
    reset()
    setFile(selected)

    const reader = new FileReader()

    reader.onerror = () => setFileErrors(['That file could not be read. Try re-saving it as CSV.'])

    reader.onload = event => {
      const text = event.target?.result
      if (typeof text !== 'string') {
        setFileErrors(['That file could not be read as text. Save it as CSV, not .xlsx.'])
        return
      }

      // A real .xlsx is a zip; read as text it starts with "PK". Saying so is
      // far more use than letting it parse into nonsense.
      if (text.startsWith('PK')) {
        setFileErrors([
          'That looks like an Excel workbook (.xlsx). Open it in Excel and choose File → Save As → CSV, then upload the .csv.'
        ])
        return
      }

      const { headers, rows } = parseCsv(text)

      if (headers.length === 0 || rows.length === 0) {
        setFileErrors(['The file needs a header row and at least one row of data.'])
        return
      }
      if (rows.length > MAX_ROWS) {
        setFileErrors([
          `The file has ${rows.length} rows; one import is limited to ${MAX_ROWS}. Split it and import in parts.`
        ])
        return
      }

      // Headers are matched by name, so column order does not matter and extra
      // columns are ignored rather than being an error.
      const missing = config.columns
        .filter(column => column.required && !headers.includes(column.key))
        .map(column => column.key)

      if (missing.length > 0) {
        setFileErrors([
          `The file is missing required column${missing.length > 1 ? 's' : ''}: ${missing.join(', ')}. Download the template below.`
        ])
        return
      }

      const index = new Map(config.columns.map(column => [column.key, headers.indexOf(column.key)]))

      const parsedRows: ParsedRow[] = rows.map(row => ({
        rowNumber: row.lineNumber,
        values: Object.fromEntries(
          config.columns.map(column => {
            const at = index.get(column.key) ?? -1
            return [column.key, at === -1 ? '' : (row.cells[at] ?? '').trim()]
          })
        )
      }))

      const problems = config.validate(parsedRows, context)
      for (const row of parsedRows) row.error = problems.get(row.rowNumber)

      setParsed(parsedRows)
      setRowErrors(
        parsedRows
          .filter(row => row.error)
          .map(row => `Row ${row.rowNumber}: ${row.error}`)
      )
    }

    reader.readAsText(selected)
  }

  const runImport = async () => {
    if (parsed.length === 0 || rowErrors.length > 0) return
    setImporting(true)
    try {
      const response = await config.submit(
        parsed.map(row => ({ rowNumber: row.rowNumber, ...row.values }))
      )
      setServerErrors(response.errors ?? [])
      setResult(response.imported ?? [])

      if (response.imported?.length > 0) {
        toast.success(`Imported ${response.imported.length} of ${parsed.length} ${config.noun}.`)
      } else {
        toast.error(`Nothing was imported — every row was rejected.`)
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'The import failed.')
    } finally {
      setImporting(false)
    }
  }

  const downloadResults = () => {
    if (!result) return
    downloadCsv(`${config.templateName}_imported_${Date.now()}.csv`, [
      config.resultColumns.map(column => column.label),
      ...result.map(row => config.resultColumns.map(column => String(row[column.key] ?? '')))
    ])
  }

  const validCount = parsed.length - rowErrors.length
  const hasCredentials = Boolean(
    config.credentialsColumn && result?.some(row => row[config.credentialsColumn!])
  )

  const previewColumns = useMemo(
    () => config.columns.slice(0, 6),
    [config.columns]
  )

  return (
    <Dialog open={open} onOpenChange={next => (next ? onOpenChange(true) : close())}>
      <DialogContent className='max-h-[85vh] overflow-y-auto sm:max-w-[46rem]'>
        <DialogHeader>
          <DialogTitle>{config.title}</DialogTitle>
          <DialogDescription>{config.description}</DialogDescription>
        </DialogHeader>

        {result ? (
          <ImportResults
            config={config}
            result={result}
            serverErrors={serverErrors}
            attempted={parsed.length}
            hasCredentials={hasCredentials}
          />
        ) : (
          <div className='space-y-4 py-2'>
            {/* Format guidance sits next to the template, so the answer to
                "what shape should this be?" is one click away. */}
            <div className='bg-muted/30 flex items-start justify-between gap-4 rounded-lg border px-3 py-2.5'>
              <div className='text-muted-foreground text-xs'>
                <p>
                  Required:{' '}
                  <span className='font-mono'>
                    {config.columns.filter(c => c.required).map(c => c.key).join(', ')}
                  </span>
                </p>
                {config.columns.some(c => !c.required) && (
                  <p className='mt-0.5'>
                    Optional:{' '}
                    <span className='font-mono'>
                      {config.columns.filter(c => !c.required).map(c => c.key).join(', ')}
                    </span>
                  </p>
                )}
                <p className='mt-1'>Column order does not matter. Extra columns are ignored.</p>
              </div>
              <Button variant='outline' size='sm' className='shrink-0' onClick={downloadTemplate}>
                <IconFileDownload />
                Template
              </Button>
            </div>

            <div className='bg-muted/10 hover:bg-muted/20 relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors'>
              <input
                ref={inputRef}
                type='file'
                accept='.csv,text/csv'
                onChange={e => handleFile(e.target.files?.[0])}
                className='absolute inset-0 cursor-pointer opacity-0'
                aria-label={`Choose a CSV of ${config.noun}`}
              />
              <IconUpload className='text-muted-foreground mb-2 size-10' />
              <p className='text-sm font-medium'>{file ? file.name : 'Choose a CSV file, or drop one here'}</p>
              <p className='text-muted-foreground mt-1 text-xs'>
                CSV only — in Excel, use File → Save As → CSV
              </p>
            </div>

            {fileErrors.length > 0 && <ErrorPanel title='This file cannot be read' items={fileErrors} />}

            {rowErrors.length > 0 && (
              <ErrorPanel
                title={`Fix ${rowErrors.length} row${rowErrors.length > 1 ? 's' : ''} before importing`}
                items={rowErrors}
              />
            )}

            {parsed.length > 0 && (
              <div className='space-y-2'>
                <p className='text-muted-foreground text-xs font-semibold'>
                  Preview — {parsed.length} row{parsed.length > 1 ? 's' : ''}
                  {rowErrors.length > 0
                    ? ` · ${validCount} ready, ${rowErrors.length} with problems`
                    : ' · all valid'}
                </p>
                <div className='max-h-[15rem] overflow-auto rounded-lg border'>
                  <table className='w-full text-left text-xs'>
                    <thead className='bg-muted text-muted-foreground sticky top-0 font-medium uppercase'>
                      <tr>
                        {previewColumns.map(column => (
                          <th key={column.key} className='px-3 py-1.5 whitespace-nowrap'>
                            {column.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className='divide-y'>
                      {parsed.slice(0, PREVIEW_LIMIT).map(row => (
                        <tr
                          key={row.rowNumber}
                          className={row.error ? 'bg-destructive/5' : 'hover:bg-muted/40'}
                          title={row.error}
                        >
                          {previewColumns.map(column => (
                            <td key={column.key} className='px-3 py-1.5 whitespace-nowrap'>
                              {row.values[column.key] || '—'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {parsed.length > PREVIEW_LIMIT && (
                    <div className='bg-muted/20 text-muted-foreground border-t p-2 text-center text-xs'>
                      Showing the first {PREVIEW_LIMIT} of {parsed.length} rows.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          {result ? (
            <>
              <Button variant='outline' onClick={downloadResults}>
                <IconDownload />
                Download {hasCredentials ? 'credentials' : 'results'} CSV
              </Button>
              <Button onClick={close}>Done</Button>
            </>
          ) : (
            <>
              <Button variant='outline' onClick={close}>
                Cancel
              </Button>
              <Button
                onClick={runImport}
                disabled={parsed.length === 0 || rowErrors.length > 0 || importing}
              >
                {importing ? (
                  <>
                    <IconLoader2 className='animate-spin' />
                    Importing…
                  </>
                ) : (
                  `Import ${parsed.length || ''} ${config.noun}`.trim()
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

const ErrorPanel = ({ title, items }: { title: string; items: string[] }) => (
  <div className='bg-destructive/10 border-destructive/20 text-destructive max-h-[10rem] space-y-1 overflow-y-auto rounded-lg border p-3 text-xs'>
    <div className='flex items-center gap-1.5 font-semibold'>
      <IconAlertCircle className='size-4' />
      <span>{title}</span>
    </div>
    <ul className='list-disc space-y-0.5 pl-4'>
      {items.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </ul>
  </div>
)

/** The post-import screen: what landed, what did not, and what to save now. */
const ImportResults = ({
  config,
  result,
  serverErrors,
  attempted,
  hasCredentials
}: {
  config: ImportConfig
  result: Record<string, unknown>[]
  serverErrors: string[]
  attempted: number
  hasCredentials: boolean
}) => (
  <div className='space-y-4 py-2'>
    {result.length > 0 ? (
      <div className='flex items-center gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4 text-emerald-600 dark:text-emerald-400'>
        <IconCircleCheck className='size-5 shrink-0' />
        <div>
          <p className='font-semibold'>Import complete</p>
          <p className='text-xs'>
            {result.length} of {attempted} {config.noun} imported.
          </p>
        </div>
      </div>
    ) : (
      <ErrorPanel title='Nothing was imported' items={['Every row was rejected — see below.']} />
    )}

    {serverErrors.length > 0 && (
      <div className='max-h-[9rem] space-y-1 overflow-y-auto rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-400'>
        <p className='font-semibold'>
          {serverErrors.length} row{serverErrors.length > 1 ? 's were' : ' was'} skipped:
        </p>
        <ul className='list-disc space-y-0.5 pl-4'>
          {serverErrors.map((error, index) => (
            <li key={index}>{error}</li>
          ))}
        </ul>
      </div>
    )}

    {result.length > 0 && (
      <div className='overflow-hidden rounded-lg border'>
        <table className='w-full text-left text-xs'>
          <thead className='bg-muted text-muted-foreground font-medium uppercase'>
            <tr>
              {config.resultColumns.map(column => (
                <th key={column.key} className='px-3 py-2 whitespace-nowrap'>
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className='divide-y'>
            {result.slice(0, RESULT_LIMIT).map((row, index) => (
              <tr key={index} className='hover:bg-muted/40'>
                {config.resultColumns.map(column => (
                  <td
                    key={column.key}
                    className={`px-3 py-2 whitespace-nowrap ${column.mono ? 'font-mono text-amber-600 dark:text-amber-400' : ''}`}
                  >
                    {String(row[column.key] ?? '—')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {result.length > RESULT_LIMIT && (
          <div className='bg-muted/20 text-muted-foreground border-t p-2 text-center text-xs'>
            Showing the first {RESULT_LIMIT} of {result.length} — download the CSV for the full list.
          </div>
        )}
      </div>
    )}

    {hasCredentials && (
      <div className='rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-400'>
        <strong>Download these now.</strong> Passwords are stored hashed and cannot be shown again
        once this dialog closes.
      </div>
    )}
  </div>
)

export default BulkImportDialog
