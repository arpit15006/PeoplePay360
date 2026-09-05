import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import type { EmployeeRow, EmployeeStatus, EmployeeType } from '@/types/employee';

/** Raw shape returned by GET /api/employees. */
interface ApiEmployee {
  id: string;
  employeeCode: string;
  name: string;
  email: string;
  jobPosition: string;
  employeeType: EmployeeType;
  status: EmployeeStatus;
  department: { id: string; name: string } | null;
  manager: { id: string; name: string } | null;
  workingSchedule: { id: string; name: string; weeklyHours: number } | null;
}

interface EmployeesResponse {
  success: boolean;
  count: number;
  data: ApiEmployee[];
}

const toRow = (employee: ApiEmployee): EmployeeRow => ({
  id: employee.id,
  employeeCode: employee.employeeCode,
  name: employee.name,
  email: employee.email,
  department: employee.department?.name ?? 'Unassigned',
  jobPosition: employee.jobPosition,
  manager: employee.manager?.name ?? null,
  workingSchedule: employee.workingSchedule?.name ?? null,
  employeeType: employee.employeeType,
  status: employee.status,
});

/** PRD Screen 2 data source — live from the employees API. */
export function useEmployees() {
  return useQuery<EmployeeRow[]>({
    queryKey: ['employees'],
    queryFn: async () => {
      const response = await api.get<EmployeesResponse>('/employees');
      return (response.data ?? []).map(toRow);
    },
  });
}
