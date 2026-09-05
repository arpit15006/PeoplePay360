import { api } from './client';
import type { ContractInput, ContractRow } from '@/types/contract';

interface ListEnvelope {
  success: boolean;
  count: number;
  data: ContractRow[];
}

interface ItemEnvelope {
  success: boolean;
  data: ContractRow;
}

export interface NamedRecord {
  id: string;
  name: string;
}

export const contractsApi = {
  list: (employeeId?: string) =>
    api
      .get<ListEnvelope>(`/contracts${employeeId ? `?employeeId=${employeeId}` : ''}`)
      .then(r => r.data ?? []),

  getById: (id: string) => api.get<ItemEnvelope>(`/contracts/${id}`).then(r => r.data),

  create: (body: ContractInput) => api.post<ItemEnvelope>('/contracts', body).then(r => r.data),

  update: (id: string, body: Partial<ContractInput>) =>
    api.put<ItemEnvelope>(`/contracts/${id}`, body).then(r => r.data),

  salaryStructures: () =>
    api
      .get<{ success: boolean; data: NamedRecord[] }>('/salary-structures')
      .then(r => r.data ?? []),
};
