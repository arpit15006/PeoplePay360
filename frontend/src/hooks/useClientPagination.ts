import { useEffect, useMemo, useState } from 'react'

import { PAGE_SIZE_OPTIONS } from '@/components/shadcn-studio/data-table/data-table-parts'

/**
 * Client-side paging for the tables that render a plain `rows.map(...)` rather
 * than running on TanStack — Attendance and Payruns.
 *
 * At ~1,000 employees the cost these screens pay is DOM nodes, not payload, so
 * slicing the already-fetched rows is enough; the shared footer
 * (`DataTablePaginationBase`) takes exactly what this returns.
 */
export function useClientPagination<T>(rows: T[], initialPageSize = PAGE_SIZE_OPTIONS[0]) {
  const [pageIndex, setPageIndex] = useState(0)
  const [pageSize, setPageSize] = useState(initialPageSize)

  const total = rows.length
  const pageCount = Math.max(1, Math.ceil(total / pageSize))

  // Filtering can shorten the list from under the reader — a search that leaves
  // two rows must not strand them on page 7.
  useEffect(() => {
    if (pageIndex > pageCount - 1) setPageIndex(0)
  }, [pageIndex, pageCount])

  const page = useMemo(
    () => rows.slice(pageIndex * pageSize, pageIndex * pageSize + pageSize),
    [rows, pageIndex, pageSize]
  )

  return {
    /** The rows to render for the current page. */
    page,
    pageIndex,
    pageSize,
    pageCount,
    total,
    onPageChange: setPageIndex,
    onPageSizeChange: (next: number) => {
      setPageSize(next)
      setPageIndex(0)
    }
  }
}
