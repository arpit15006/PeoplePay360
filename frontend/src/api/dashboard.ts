import { api } from './client';
import type { DashboardFilters, DashboardMetrics } from '@/types/dashboard';

interface Env<T> { success: boolean; data: T }

const toQuery = (filters: DashboardFilters) => {
  const params = new URLSearchParams();
  if (filters.period) params.set('period', filters.period);
  if (filters.departmentId) params.set('departmentId', filters.departmentId);
  if (filters.employeeType) params.set('employeeType', filters.employeeType);
  const qs = params.toString();
  return qs ? `?${qs}` : '';
};

export const dashboardApi = {
  metrics: (filters: DashboardFilters = {}) =>
    api.get<Env<DashboardMetrics>>(`/dashboard${toQuery(filters)}`).then(r => r.data),
};
