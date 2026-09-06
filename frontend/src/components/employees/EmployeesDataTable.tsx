'use client'

import type { CSSProperties } from 'react'
import { useState, useId } from 'react'

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent
} from '@dnd-kit/core'
import { restrictToHorizontalAxis } from '@dnd-kit/modifiers'
import { arrayMove, horizontalListSortingStrategy, SortableContext, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type {
  Cell,
  ColumnDef,
  ColumnFiltersState,
  Header,
  PaginationState,
  SortingState
} from '@tanstack/react-table'
import {
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable
} from '@tanstack/react-table'
import { PersonAvatar } from '@/components/common/PersonAvatar'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { IconGripVertical, IconChevronUp, IconChevronDown } from '@tabler/icons-react'

import {
  DataTableFacetFilter,
  DataTablePagination
} from '@/components/shadcn-studio/data-table/data-table-parts'
import EmployeeStatusBadge from '@/components/employees/EmployeeStatusBadge'
import { type EmployeeRow, type EmployeeStatus } from '@/types/employee'

/**
 * The three faceted filters below deliberately do not repeat the ones in the
 * Employees toolbar. Search, department and status live up there because they
 * also drive the Kanban view; job position, manager and working schedule are
 * list-only refinements and belong to the table.
 */
const NO_MANAGER = 'No manager'
const NO_SCHEDULE = 'No schedule'

/**
 * PRD Screen 2 list view — the shadcn-studio data-table-08 variant with its
 * draggable columns and sorting kept intact, but the demo columns replaced by
 * the PRD's: Employee, Department, Job Position, Manager, Working Schedule,
 * Status. Salary / DOB / Hire Date are deliberately absent: pay is payroll
 * restricted and the Employee role must never see a colleague's wage.
 */
const columns: ColumnDef<EmployeeRow>[] = [
  {
    id: 'name',
    header: 'Employee',
    accessorKey: 'name',
    cell: ({ row }) => (
      <div className='flex items-center gap-3'>
        <PersonAvatar name={row.original.name} />
        <div className='min-w-0'>
          <div className='truncate font-medium'>{row.original.name}</div>
          <div className='text-muted-foreground truncate text-xs'>{row.original.employeeCode}</div>
        </div>
      </div>
    ),
    sortUndefined: 'last',
    sortDescFirst: false
  },
  {
    id: 'department',
    header: 'Department',
    accessorKey: 'department',
    cell: ({ row }) => <div>{row.getValue('department')}</div>
  },
  {
    id: 'jobPosition',
    header: 'Job Position',
    accessorKey: 'jobPosition',
    filterFn: 'equalsString',
    cell: ({ row }) => <div>{row.getValue('jobPosition')}</div>
  },
  {
    id: 'manager',
    header: 'Manager',
    // A null manager still needs a value the facet filter can offer.
    accessorFn: row => row.manager ?? NO_MANAGER,
    filterFn: 'equalsString',
    cell: ({ row }) => (
      <div className={row.original.manager ? '' : 'text-muted-foreground'}>
        {row.original.manager ?? '—'}
      </div>
    )
  },
  {
    id: 'workingSchedule',
    header: 'Working Schedule',
    accessorFn: row => row.workingSchedule ?? NO_SCHEDULE,
    filterFn: 'equalsString',
    cell: ({ row }) => (
      <div className={row.original.workingSchedule ? '' : 'text-muted-foreground'}>
        {row.original.workingSchedule ?? '—'}
      </div>
    )
  },
  {
    id: 'status',
    header: 'Status',
    accessorKey: 'status',
    cell: ({ row }) => <EmployeeStatusBadge status={row.getValue('status') as EmployeeStatus} />
  }
]

type Props = {
  data: EmployeeRow[]
  onRowClick?: (employee: EmployeeRow) => void
}

const EmployeesDataTable = ({ data, onRowClick }: Props) => {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 })
  const [columnOrder, setColumnOrder] = useState<string[]>(columns.map(column => column.id as string))

  const table = useReactTable({
    data,
    columns,
    columnResizeMode: 'onChange',
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onPaginationChange: setPagination,
    state: {
      sorting,
      columnFilters,
      pagination,
      columnOrder
    },
    onColumnOrderChange: setColumnOrder,
    enableSortingRemoval: false
  })

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event

    if (active && over && active.id !== over.id) {
      setColumnOrder(columnOrder => {
        const oldIndex = columnOrder.indexOf(active.id as string)
        const newIndex = columnOrder.indexOf(over.id as string)

        return arrayMove(columnOrder, oldIndex, newIndex)
      })
    }
  }

  const sensors = useSensors(useSensor(MouseSensor, {}), useSensor(TouchSensor, {}), useSensor(KeyboardSensor, {}))

  return (
    <Card className='w-full gap-0 py-0'>
      {/* A toolbar, not a filter panel: the page already carries its own header
          and search above, so this stays one compact row. */}
      <div className='flex flex-wrap items-center gap-x-5 gap-y-2 border-b px-4 py-2.5'>
        <DataTableFacetFilter compact column={table.getColumn('jobPosition')} label='Job Position' />
        <DataTableFacetFilter compact column={table.getColumn('manager')} label='Manager' />
        <DataTableFacetFilter compact column={table.getColumn('workingSchedule')} label='Schedule' />
      </div>

      <div className='overflow-x-auto border-b'>
        <DndContext
          id={useId()}
          collisionDetection={closestCenter}
          modifiers={[restrictToHorizontalAxis]}
          onDragEnd={handleDragEnd}
          sensors={sensors}
        >
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map(headerGroup => (
                <TableRow key={headerGroup.id} className='bg-muted/50 [&>th]:border-t-0'>
                  <SortableContext items={columnOrder} strategy={horizontalListSortingStrategy}>
                    {headerGroup.headers.map(header => (
                      <DraggableTableHeader key={header.id} header={header} />
                    ))}
                  </SortableContext>
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map(row => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && 'selected'}
                    onClick={() => onRowClick?.(row.original)}
                    className={onRowClick ? 'cursor-pointer' : undefined}
                  >
                    {row.getVisibleCells().map(cell => (
                      <SortableContext key={cell.id} items={columnOrder} strategy={horizontalListSortingStrategy}>
                        <DragAlongCell key={cell.id} cell={cell} />
                      </SortableContext>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className='h-24 text-center'>
                    No employees match the current filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </DndContext>
      </div>

      <DataTablePagination table={table} noun='employees' />
    </Card>
  )
}

const DraggableTableHeader = ({ header }: { header: Header<EmployeeRow, unknown> }) => {
  const { attributes, isDragging, listeners, setNodeRef, transform, transition } = useSortable({
    id: header.column.id
  })

  const style: CSSProperties = {
    opacity: isDragging ? 0.8 : 1,
    position: 'relative',
    transform: CSS.Translate.toString(transform),
    transition,
    whiteSpace: 'nowrap',
    width: header.column.getSize(),
    zIndex: isDragging ? 1 : 0
  }

  return (
    <TableHead
      ref={setNodeRef}
      className='before:bg-border relative h-10 border-t before:absolute before:inset-y-0 before:left-0 before:w-px first:before:bg-transparent'
      style={style}
      aria-sort={
        header.column.getIsSorted() === 'asc'
          ? 'ascending'
          : header.column.getIsSorted() === 'desc'
            ? 'descending'
            : 'none'
      }
    >
      <div className='flex items-center justify-start gap-0.5'>
        <Button
          size='icon'
          variant='ghost'
          className='-ml-2 size-7'
          {...attributes}
          {...listeners}
          aria-label='Drag to reorder'
        >
          <IconGripVertical className='opacity-60' aria-hidden='true' />
        </Button>
        <span className='grow truncate'>
          {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
        </span>
        <Button
          size='icon'
          variant='ghost'
          className='group -mr-1 size-7'
          onClick={header.column.getToggleSortingHandler()}
          onKeyDown={e => {
            if (header.column.getCanSort() && (e.key === 'Enter' || e.key === ' ')) {
              e.preventDefault()
              header.column.getToggleSortingHandler()?.(e)
            }
          }}
          aria-label='Toggle sorting'
        >
          {{
            asc: <IconChevronUp className='shrink-0 opacity-60' size={16} aria-hidden='true' />,
            desc: <IconChevronDown className='shrink-0 opacity-60' size={16} aria-hidden='true' />
          }[header.column.getIsSorted() as string] ?? (
            <IconChevronUp className='shrink-0 opacity-0 group-hover:opacity-60' size={16} aria-hidden='true' />
          )}
        </Button>
      </div>
    </TableHead>
  )
}

const DragAlongCell = ({ cell }: { cell: Cell<EmployeeRow, unknown> }) => {
  const { isDragging, setNodeRef, transform, transition } = useSortable({
    id: cell.column.id
  })

  const style: CSSProperties = {
    opacity: isDragging ? 0.8 : 1,
    position: 'relative',
    transform: CSS.Translate.toString(transform),
    transition,
    width: cell.column.getSize(),
    zIndex: isDragging ? 1 : 0
  }

  return (
    <TableCell ref={setNodeRef} className='truncate' style={style}>
      {flexRender(cell.column.columnDef.cell, cell.getContext())}
    </TableCell>
  )
}

export default EmployeesDataTable
