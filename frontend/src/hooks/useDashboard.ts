import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '@/api/dashboard';
import type { DashboardFilters } from '@/types/dashboard';

export const useDashboard = (filters: DashboardFilters = {}) =>
  useQuery({
    queryKey: ['dashboard', filters.period ?? 'current', filters.departmentId ?? 'all', filters.employeeType ?? 'all'],
    queryFn: () => dashboardApi.metrics(filters),
  });
