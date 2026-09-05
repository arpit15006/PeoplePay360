/**
 * The description of one importable entity, which is all the shared dialog
 * needs in order to run an import end to end.
 *
 * Every screen's importer is one of these objects. Nothing about employees,
 * attendance or contracts is hard-coded into the dialog itself.
 */

export interface ImportColumn {
  /** Header as it appears in the CSV, lower-case. */
  key: string
  /** Column heading in the preview table. */
  label: string
  /** Whether a missing header should stop the import. */
  required: boolean
  /** Sample values used to build the downloadable template. */
  samples: string[]
}

/** A row after parsing, keyed by column, plus where it came from and why it failed. */
export interface ParsedRow {
  rowNumber: number
  values: Record<string, string>
  error?: string
}

export interface ImportConfig {
  /** Used in the title, the button and the template file name. */
  entity: string
  /** Plural noun for counts: "employees", "attendance rows". */
  noun: string
  title: string
  description: string
  columns: ImportColumn[]
  /** Template file name, without extension. */
  templateName: string
  /**
   * Row-level checks that need no server round trip, run against the whole
   * parsed file so in-file duplicates can be spotted.
   *
   * Returns a message per bad row, keyed by rowNumber. The server repeats every
   * one of these checks; this exists so the operator sees them before uploading.
   */
  validate: (rows: ParsedRow[], context: ImportContext) => Map<number, string>
  /** POSTs the rows and returns what the server made of them. */
  submit: (rows: { rowNumber: number; [key: string]: unknown }[]) => Promise<ImportResponse>
  /** Columns shown in the success table, over and above what was imported. */
  resultColumns: { key: string; label: string; mono?: boolean }[]
  /** Set when the import mints credentials that can only be read once. */
  credentialsColumn?: string
}

/** Live reference data the validators match names against. */
export interface ImportContext {
  departments: string[]
  schedules: string[]
  salaryStructures: string[]
  timeOffTypes: string[]
  employeeEmails: string[]
  employeeCodes: string[]
}

export interface ImportResponse {
  imported: Record<string, unknown>[]
  errors: string[]
}
