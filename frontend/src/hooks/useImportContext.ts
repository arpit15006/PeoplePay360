import { useMemo } from 'react'

import { useDepartmentList } from '@/hooks/useDepartmentList'
import { useEmployees } from '@/hooks/useEmployees'
import { useSchedulesList } from '@/hooks/useSchedules'
import { useSalaryStructures } from '@/hooks/useSalary'
import { useTimeOffTypes } from '@/hooks/useTimeOff'
import type { ImportContext } from '@/components/bulk/types'

/**
 * The live reference data the import validators match CSV names against.
 *
 * Everything is lower-cased once here so the validators can compare without
 * re-normalising per row — a 1,000-row file checks each name against these
 * lists, and doing the casing work inside that loop is wasted effort.
 *
 * These are the same queries the surrounding screens already run, so TanStack
 * serves them from cache rather than refetching when a dialog opens.
 */
export function useImportContext(): ImportContext {
  const { data: departments = [] } = useDepartmentList()
  const { data: employees = [] } = useEmployees()
  const { data: schedules = [] } = useSchedulesList()
  const { data: structures = [] } = useSalaryStructures()
  const { data: timeOffTypes = [] } = useTimeOffTypes()

  return useMemo(
    () => ({
      departments: departments.map((d: { name: string }) => d.name.toLowerCase()),
      schedules: schedules.map((s: { name: string }) => s.name.toLowerCase()),
      salaryStructures: structures.map((s: { name: string }) => s.name.toLowerCase()),
      timeOffTypes: timeOffTypes.map((t: { name: string }) => t.name.toLowerCase()),
      employeeEmails: employees.map(e => e.email.toLowerCase()),
      employeeCodes: employees.map(e => e.employeeCode.toLowerCase())
    }),
    [departments, schedules, structures, timeOffTypes, employees]
  )
}
