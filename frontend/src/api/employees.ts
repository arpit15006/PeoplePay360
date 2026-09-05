import { api } from './client';
import type {
  EmployeeCreate,
  EmployeeDetail,
  EmployeeRelatedCounts,
  EmployeeUpdate
} from '@/types/employee';

interface Envelope<T> {
  success: boolean;
  data: T;
}

export interface NamedRecord {
  id: string;
  name: string;
}

export const employeesApi = {
  getById: (id: string) =>
    api.get<Envelope<EmployeeDetail>>(`/employees/${id}`).then(r => r.data),

  /** Smart-button counts — PRD Screen 3 related records. */
  related: (id: string) =>
    api.get<Envelope<EmployeeRelatedCounts>>(`/employees/${id}/related`).then(r => r.data),

  create: (body: EmployeeCreate) =>
    api.post<Envelope<EmployeeDetail>>('/employees', body).then(r => r.data),

  remove: (id: string) => api.del<{ success: boolean }>(`/employees/${id}`),

  update: (id: string, body: EmployeeUpdate) =>
    api.put<Envelope<EmployeeDetail>>(`/employees/${id}`, body).then(r => r.data),

  departments: () =>
    api.get<Envelope<NamedRecord[]>>('/departments').then(r => r.data ?? []),

  schedules: () =>
    api.get<Envelope<NamedRecord[]>>('/schedules').then(r => r.data ?? []),
};
