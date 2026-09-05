import { api } from './client'
import type { ManagedUser, UserInput } from '@/types/user-admin'

interface Env<T> { success: boolean; count?: number; data: T }

export const usersApi = {
  list: () => api.get<Env<ManagedUser[]>>('/users').then(r => r.data ?? []),
  create: (body: UserInput) => api.post<Env<ManagedUser>>('/users', body).then(r => r.data),
  update: (id: string, body: Partial<UserInput>) =>
    api.put<Env<ManagedUser>>(`/users/${id}`, body).then(r => r.data),
  remove: (id: string) => api.del<{ success: boolean }>(`/users/${id}`),
}
