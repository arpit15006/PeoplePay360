import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { employeesApi } from '@/api/employees';
import type { EmployeeUpdate } from '@/types/employee';

/** PRD Screen 3 — the employee record itself. */
export function useEmployee(id: string | undefined) {
  return useQuery({
    queryKey: ['employee', id],
    queryFn: () => employeesApi.getById(id!),
    enabled: Boolean(id),
  });
}

/** Smart-button counts (Contracts, Attendance, Time Off, Allocations). */
export function useEmployeeRelated(id: string | undefined) {
  return useQuery({
    queryKey: ['employee', id, 'related'],
    queryFn: () => employeesApi.related(id!),
    enabled: Boolean(id),
  });
}

export function useDepartments() {
  return useQuery({ queryKey: ['departments'], queryFn: employeesApi.departments });
}

export function useSchedules() {
  return useQuery({ queryKey: ['schedules'], queryFn: employeesApi.schedules });
}

export function useUpdateEmployee(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: EmployeeUpdate) => employeesApi.update(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee', id] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });
}
