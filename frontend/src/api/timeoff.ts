import { api } from './client';
import type { TimeOffAllocation, TimeOffRequest, TimeOffType } from '@/types/timeoff';

interface Env<T> { success: boolean; count?: number; data: T }

export const timeOffApi = {
  types: () => api.get<Env<TimeOffType[]>>('/timeoff/types').then(r => r.data ?? []),
  createType: (body: Partial<TimeOffType>) =>
    api.post<Env<TimeOffType>>('/timeoff/types', body).then(r => r.data),
  updateType: (id: string, body: Partial<TimeOffType>) =>
    api.put<Env<TimeOffType>>(`/timeoff/types/${id}`, body).then(r => r.data),

  allocations: (employeeId?: string) =>
    api
      .get<Env<TimeOffAllocation[]>>(`/timeoff/allocations${employeeId ? `?employeeId=${employeeId}` : ''}`)
      .then(r => r.data ?? []),
  createAllocation: (body: Record<string, unknown>) =>
    api.post<Env<TimeOffAllocation>>('/timeoff/allocations', body).then(r => r.data),

  requests: (employeeId?: string) =>
    api
      .get<Env<TimeOffRequest[]>>(`/timeoff/requests${employeeId ? `?employeeId=${employeeId}` : ''}`)
      .then(r => r.data ?? []),
  createRequest: (body: Record<string, unknown>) =>
    api.post<Env<TimeOffRequest>>('/timeoff/requests', body).then(r => r.data),
  approve: (id: string) =>
    api.put<Env<TimeOffRequest>>(`/timeoff/requests/${id}/approve`).then(r => r.data),
  refuse: (id: string) =>
    api.put<Env<TimeOffRequest>>(`/timeoff/requests/${id}/refuse`).then(r => r.data),
};
