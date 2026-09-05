import { api } from './client';
import type { Payrun, PayrunWarning, Payslip } from '@/types/payrun';

interface Env<T> { success: boolean; count?: number; data: T }
/** compute/validate/mark-paid return the record under `payrun`, not `data`. */
interface ActionEnv { success: boolean; message?: string; payrun?: Payrun; data?: Payrun }

const unwrap = (r: ActionEnv) => (r.payrun ?? r.data) as Payrun;

export interface CreatePayrunInput {
  salaryStructureId: string;
  period: string;
  periodStartDate: string;
  periodEndDate: string;
  employeeIds: string[];
}

export const payrunsApi = {
  list: () => api.get<Env<Payrun[]>>('/payruns').then(r => r.data ?? []),
  getById: (id: string) => api.get<ActionEnv>(`/payruns/${id}`).then(unwrap),
  warnings: (id: string) => api.get<Env<PayrunWarning[]>>(`/payruns/${id}/warnings`).then(r => r.data ?? []),
  create: (body: CreatePayrunInput) => api.post<ActionEnv>('/payruns', body).then(unwrap),
  compute: (id: string) => api.post<ActionEnv>(`/payruns/${id}/compute`).then(unwrap),
  validate: (id: string) => api.post<ActionEnv>(`/payruns/${id}/validate`).then(unwrap),
  markPaid: (id: string) => api.post<ActionEnv>(`/payruns/${id}/mark-paid`).then(unwrap),
  sendPayslips: (id: string) =>
    api.post<{ success: boolean; message?: string; sent?: number; failed?: number }>(
      `/payruns/${id}/send-payslips`
    ),

  payslips: (payrunId?: string) =>
    api
      .get<Env<Payslip[]>>(`/payslips${payrunId ? `?payrunId=${payrunId}` : ''}`)
      .then(r => r.data ?? []),
  payslip: (id: string) => api.get<Env<Payslip>>(`/payslips/${id}`).then(r => r.data),
};
