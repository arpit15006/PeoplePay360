import { api } from './client';
import type { AttendanceInput, AttendanceRow } from '@/types/attendance';

interface ListEnvelope { success: boolean; count: number; data: AttendanceRow[] }
interface ItemEnvelope { success: boolean; data: AttendanceRow }

export const attendanceApi = {
  list: (employeeId?: string) =>
    api
      .get<ListEnvelope>(`/attendance${employeeId ? `?employeeId=${employeeId}` : ''}`)
      .then(r => r.data ?? []),
  create: (body: AttendanceInput) => api.post<ItemEnvelope>('/attendance', body).then(r => r.data),
  update: (id: string, body: AttendanceInput) =>
    api.put<ItemEnvelope>(`/attendance/${id}`, body).then(r => r.data),
};
