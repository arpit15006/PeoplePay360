import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { payrunsApi, type CreatePayrunInput } from '@/api/payruns';

function useInvalidatePayruns() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ['payruns'] });
    queryClient.invalidateQueries({ queryKey: ['payslips'] });
  };
}

export const usePayruns = () => useQuery({ queryKey: ['payruns'], queryFn: payrunsApi.list });

export const usePayrun = (id: string | undefined) =>
  useQuery({ queryKey: ['payruns', id], queryFn: () => payrunsApi.getById(id!), enabled: Boolean(id) });

export const usePayrunWarnings = (id: string | undefined) =>
  useQuery({ queryKey: ['payruns', id, 'warnings'], queryFn: () => payrunsApi.warnings(id!), enabled: Boolean(id) });

export const usePayslips = (payrunId?: string) =>
  useQuery({ queryKey: ['payslips', payrunId ?? 'all'], queryFn: () => payrunsApi.payslips(payrunId) });

export const usePayslip = (id: string | undefined) =>
  useQuery({ queryKey: ['payslips', id], queryFn: () => payrunsApi.payslip(id!), enabled: Boolean(id) });

export function useCreatePayrun() {
  const invalidate = useInvalidatePayruns();
  return useMutation({ mutationFn: (body: CreatePayrunInput) => payrunsApi.create(body), onSuccess: invalidate });
}

/** Compute, Validate, Mark Paid and Send Payslips share one mutation shape. */
export function usePayrunAction() {
  const invalidate = useInvalidatePayruns();
  return useMutation<unknown, Error, { id: string; action: 'compute' | 'validate' | 'markPaid' | 'send' }>({
    mutationFn: ({ id, action }) => {
      if (action === 'compute') return payrunsApi.compute(id);
      if (action === 'validate') return payrunsApi.validate(id);
      if (action === 'markPaid') return payrunsApi.markPaid(id);
      return payrunsApi.sendPayslips(id);
    },
    onSuccess: invalidate,
  });
}
