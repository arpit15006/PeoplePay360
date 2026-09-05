import { api } from './client';
import type { ScheduleInput, WorkingSchedule } from '@/types/schedule';

interface ListEnvelope { success: boolean; count: number; data: WorkingSchedule[] }
interface ItemEnvelope { success: boolean; data: WorkingSchedule }

export const schedulesApi = {
  list: () => api.get<ListEnvelope>('/schedules').then(r => r.data ?? []),
  getById: (id: string) => api.get<ItemEnvelope>(`/schedules/${id}`).then(r => r.data),
  create: (body: ScheduleInput) => api.post<ItemEnvelope>('/schedules', body).then(r => r.data),
  update: (id: string, body: Partial<ScheduleInput>) =>
    api.put<ItemEnvelope>(`/schedules/${id}`, body).then(r => r.data),
};
