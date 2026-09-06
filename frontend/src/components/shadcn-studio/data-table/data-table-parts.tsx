'use client'

import { useId, useMemo } from 'react'

import type { Column, Table as TanstackTable } from '@tanstack/react-table'
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem } from '@/components/ui/pagination'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

import { usePagination } from '@/hooks/use-pagination'

/**
 * The two reusable halves of the shadcn-studio datatable-04 block: its faceted
 * filter select and its pagination footer.
 *
 * They live here rather than inside `blocks/datatable-user.tsx` because three
 * screens now use them — Employees, Payslips and User Management — and each has
 * its own columns and its own data source. Only the chrome is shared; the block
 * itself is left untouched as the reference implementation.
 */

const ALL = 'all'

/**
 * A select whose options are whatever values the column actually holds, taken
 * from TanStack's faceted row model. Because the options come from the data,
 * a filter can never offer a value that would return nothing.
 *
 * `format` maps a stored value to its label (e.g. HR_PAYROLL_MANAGER -> "HR
 * Payroll Manager"); options are ordered by that label, not by the raw value.
 */
export function DataTableFacetFilter<TData>({
  column,
  label,
  format = String,
  className,
  compact = false,
  orderBy = 'label'
}: {
  column: Column<TData, unknown> | undefined
  label: string
  format?: (value: string) => string
  className?: string
  /** Sits the label beside a short select instead of stacking a full-width one,
      for bars that are a toolbar rather than a filter panel. */
  compact?: boolean
  /**
   * Order the options by their label (default) or by the stored value. Values
   * that sort correctly as text but read differently as labels need 'value' —
   * a period stored "2026-09" and shown "September 2026" is chronological by
   * value and alphabetical, wrongly, by label.
   */
  orderBy?: 'label' | 'value'
}) {
  const id = useId()
  const filterValue = column?.getFilterValue()
  const faceted = column?.getFacetedUniqueValues()

  const values = useMemo(() => {
    if (!faceted) return []
    // A cell may hold an array (nothing does today, but the block allowed for
    // it and dropping the guard would fail silently if one ever did).
    const flattened = Array.from(faceted.keys()).reduce<string[]>(
      (acc, curr) => (Array.isArray(curr) ? [...acc, ...curr] : [...acc, curr]),
      []
    )
    return Array.from(new Set(flattened.filter(v => v !== null && v !== undefined && v !== ''))).sort(
      (a, b) =>
        orderBy === 'value'
          ? String(a).localeCompare(String(b))
          : format(String(a)).localeCompare(format(String(b)))
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [faceted, orderBy])

  if (!column) return null

  return (
    <div className={className ?? (compact ? 'flex items-center gap-2' : 'w-full space-y-2')}>
      <Label
        htmlFor={`${id}-select`}
        className={compact ? 'text-muted-foreground text-xs whitespace-nowrap' : undefined}
      >
        {label}
      </Label>
      <Select
        value={filterValue?.toString() ?? ALL}
        onValueChange={value => column.setFilterValue(value === ALL ? undefined : value)}
      >
        <SelectTrigger
          id={`${id}-select`}
          size={compact ? 'sm' : 'default'}
          className={compact ? 'w-44' : 'w-full'}
        >
          <SelectValue placeholder={`Select ${label}`} />
        </SelectTrigger>
        <SelectContent className='p-1'>
          <SelectItem value={ALL}>All</SelectItem>
          {values.map(value => (
            <SelectItem key={String(value)} value={String(value)}>
              {format(String(value))}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100]

/**
 * "Showing 1 to 10 of 42 entries", a rows-per-page select, and the numbered
 * pager — driven by plain numbers so that tables which do not run on TanStack
 * (Attendance, Payruns) can share the same footer.
 *
 * `noun` is pluralised naively because every caller passes a regular noun
 * (entries, employees, payslips, users).
 */
export function DataTablePaginationBase({
  pageIndex,
  pageSize,
  pageCount,
  total,
  onPageChange,
  onPageSizeChange,
  noun = 'entries',
  itemsToDisplay = 5,
  pageSizeOptions = PAGE_SIZE_OPTIONS,
  className
}: {
  pageIndex: number
  pageSize: number
  pageCount: number
  total: number
  onPageChange: (pageIndex: number) => void
  onPageSizeChange?: (pageSize: number) => void
  noun?: string
  itemsToDisplay?: number
  pageSizeOptions?: number[]
  /** Overrides the default page padding, for footers inside a dialog. */
  className?: string
}) {
  const id = useId()

  const { pages, showLeftEllipsis, showRightEllipsis } = usePagination({
    currentPage: pageIndex + 1,
    totalPages: pageCount,
    paginationItemsToDisplay: itemsToDisplay
  })

  // An empty table would otherwise read "Showing 1 to 0 of 0".
  const first = total === 0 ? 0 : pageIndex * pageSize + 1
  const last = Math.min(Math.max(pageIndex * pageSize + pageSize, 0), total)

  return (
    <div className={cn('flex items-center justify-between gap-3 px-6 py-4 max-sm:flex-col md:max-lg:flex-col', className)}>
      <div className='flex items-center gap-4 max-sm:flex-col'>
        <p className='text-muted-foreground text-sm whitespace-nowrap' aria-live='polite'>
          Showing{' '}
          <span>
            {first} to {last}
          </span>{' '}
          of{' '}
          <span>
            {total} {noun}
          </span>
        </p>

        {/* At 1,000 employees ten-per-page is 100 pages, so let the reader
            widen the page rather than walk it. */}
        {onPageSizeChange && (
          <div className='flex items-center gap-2'>
            <Label htmlFor={`${id}-page-size`} className='text-muted-foreground text-sm whitespace-nowrap'>
              Rows per page
            </Label>
            <Select
              value={String(pageSize)}
              onValueChange={value => onPageSizeChange(Number(value))}
            >
              <SelectTrigger id={`${id}-page-size`} size='sm' className='w-[4.5rem]'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map(option => (
                  <SelectItem key={option} value={String(option)}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div>
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <Button
                className='disabled:pointer-events-none disabled:opacity-50'
                variant='ghost'
                onClick={() => onPageChange(pageIndex - 1)}
                disabled={pageIndex <= 0}
                aria-label='Go to previous page'
              >
                <IconChevronLeft aria-hidden='true' />
                Previous
              </Button>
            </PaginationItem>

            {showLeftEllipsis && (
              <PaginationItem>
                <PaginationEllipsis />
              </PaginationItem>
            )}

            {pages.map(page => {
              const isActive = page === pageIndex + 1

              return (
                <PaginationItem key={page}>
                  <Button
                    size='icon'
                    className={`${!isActive && 'bg-primary/10 text-primary hover:bg-primary/20 focus-visible:ring-primary/20 dark:focus-visible:ring-primary/40'}`}
                    onClick={() => onPageChange(page - 1)}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    {page}
                  </Button>
                </PaginationItem>
              )
            })}

            {showRightEllipsis && (
              <PaginationItem>
                <PaginationEllipsis />
              </PaginationItem>
            )}

            <PaginationItem>
              <Button
                className='disabled:pointer-events-none disabled:opacity-50'
                variant='ghost'
                onClick={() => onPageChange(pageIndex + 1)}
                disabled={pageIndex >= pageCount - 1}
                aria-label='Go to next page'
              >
                Next
                <IconChevronRight aria-hidden='true' />
              </Button>
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </div>
  )
}

/** The same footer, wired to a TanStack table instance. */
export function DataTablePagination<TData>({
  table,
  noun = 'entries',
  itemsToDisplay = 5
}: {
  table: TanstackTable<TData>
  noun?: string
  itemsToDisplay?: number
}) {
  const { pageIndex, pageSize } = table.getState().pagination

  return (
    <DataTablePaginationBase
      pageIndex={pageIndex}
      pageSize={pageSize}
      pageCount={table.getPageCount()}
      total={table.getRowCount()}
      onPageChange={next => table.setPageIndex(next)}
      // Resetting to the first page keeps "Showing 1 to n" honest; TanStack
      // would otherwise hold an index that the new page size overshoots.
      onPageSizeChange={next => {
        table.setPageSize(next)
        table.setPageIndex(0)
      }}
      noun={noun}
      itemsToDisplay={itemsToDisplay}
    />
  )
}
