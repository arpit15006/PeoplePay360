import { api } from './client';
import type { AttendanceInput, AttendanceRow } from '@/types/attendance';

interface ListEnvelope {
  success: boolean
  count: number
  data: AttendanceRow[]
  /** Present now the list is paged server-side. */
  total?: number
  totalPages?: number
  page?: number
  pageSize?: number
}
interface ItemEnvelope { success: boolean; data: AttendanceRow }

export const attendanceApi = {
  /**
   * One page of attendance.
   *
   * A month for a large workforce is tens of thousands of rows, so the page is
   * chosen here and the server sends only that, along with the total the pager
   * needs.
   */
  list: (params: { employeeId?: string; page?: number; pageSize?: number; status?: string } = {}) => {
    const query = new URLSearchParams()
    if (params.employeeId) query.set('employeeId', params.employeeId)
    if (params.status && params.status !== 'all') query.set('status', params.status)
    query.set('page', String(params.page ?? 1))
    query.set('pageSize', String(params.pageSize ?? 25))
    return api.get<ListEnvelope>(`/attendance?${query.toString()}`).then(r => ({
      rows: r.data ?? [],
      total: r.total ?? 0,
      totalPages: r.totalPages ?? 1,
    }))
  },
  create: (body: AttendanceInput) => api.post<ItemEnvelope>('/attendance', body).then(r => r.data),
  update: (id: string, body: AttendanceInput) =>
    api.put<ItemEnvelope>(`/attendance/${id}`, body).then(r => r.data),
};
