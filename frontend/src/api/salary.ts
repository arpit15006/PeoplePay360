import { api } from './client';
import type { SalaryRule, SalaryStructure } from '@/types/payroll';

interface Env<T> { success: boolean; count?: number; data: T }

export const salaryApi = {
  structures: () => api.get<Env<SalaryStructure[]>>('/salary-structures').then(r => r.data ?? []),
  structure: (id: string) =>
    api.get<Env<SalaryStructure>>(`/salary-structures/${id}`).then(r => r.data),
  saveStructure: (id: string | undefined, body: Partial<SalaryStructure>) =>
    id
      ? api.put<Env<SalaryStructure>>(`/salary-structures/${id}`, body).then(r => r.data)
      : api.post<Env<SalaryStructure>>('/salary-structures', body).then(r => r.data),

  rules: (structureId?: string) =>
    api
      .get<Env<SalaryRule[]>>(`/salary-rules${structureId ? `?structureId=${structureId}` : ''}`)
      .then(r => r.data ?? []),
  saveRule: (id: string | undefined, body: Partial<SalaryRule>) =>
    id
      ? api.put<Env<SalaryRule>>(`/salary-rules/${id}`, body).then(r => r.data)
      : api.post<Env<SalaryRule>>('/salary-rules', body).then(r => r.data),
  deleteRule: (id: string) => api.del<Env<null>>(`/salary-rules/${id}`),
};
