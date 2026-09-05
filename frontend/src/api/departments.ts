import { api } from './client'
import type { Department } from '@/types/department'

interface Env<T> { success: boolean; count?: number; data: T }

export const departmentsApi = {
  list: () => api.get<Env<Department[]>>('/departments').then(r => r.data ?? []),
}
