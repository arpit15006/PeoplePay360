import { useQuery } from '@tanstack/react-query';
import { MOCK_EMPLOYEES } from '@/data/employees.mock';
import type { EmployeeRow } from '@/types/employee';

/**
 * PRD Screen 2 data source.
 *
 * The employees API does not exist yet (employees.routes.ts / .controller.ts /
 * employee.service.ts are still `export {}`), so this resolves the seed-derived
 * mock. When GET /api/employees lands, replace the queryFn body with:
 *
 *   queryFn: () => api.get<EmployeeRow[]>('/employees')
 *
 * and delete src/data/employees.mock.ts. Nothing else in the screen changes.
 */
export function useEmployees() {
  return useQuery<EmployeeRow[]>({
    queryKey: ['employees'],
    queryFn: async () => {
      // Small delay so the loading skeleton is actually exercised in dev.
      await new Promise(resolve => setTimeout(resolve, 300));
      return MOCK_EMPLOYEES;
    },
  });
}
