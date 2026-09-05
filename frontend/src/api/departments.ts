import { api } from './client'
import type { Department, DepartmentInput } from '@/types/department'

interface Env<T> { success: boolean; count?: number; data: T }

export const departmentsApi = {
  list: () => api.get<Env<Department[]>>('/departments').then(r => r.data ?? []),
  create: (body: DepartmentInput) => api.post<Env<Department>>('/departments', body).then(r => r.data),
  update: (id: string, body: Partial<DepartmentInput>) =>
    api.put<Env<Department>>(`/departments/${id}`, body).then(r => r.data),
  remove: (id: string) => api.del<{ success: boolean }>(`/departments/${id}`),
}
