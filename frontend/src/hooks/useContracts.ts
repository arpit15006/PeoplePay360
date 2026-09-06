import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { contractsApi } from '@/api/contracts';
import type { ContractInput } from '@/types/contract';

export function useContracts(employeeId?: string) {
  return useQuery({
    queryKey: ['contracts', employeeId ?? 'all'],
    queryFn: () => contractsApi.list(employeeId),
  });
}

export function useContract(id: string | undefined) {
  return useQuery({
    queryKey: ['contract', id],
    queryFn: () => contractsApi.getById(id!),
    enabled: Boolean(id) && id !== 'new',
  });
}

/**
 * `enabled` is passed by the contract form: the structures endpoint is payroll
 * only, so asking for it as an HR Manager just produced a 403 and an empty list
 * that the picker then rendered as "no structure".
 */
export function useSalaryStructures(enabled = true) {
  return useQuery({
    queryKey: ['salary-structures'],
    queryFn: contractsApi.salaryStructures,
    enabled,
  });
}

export function useSaveContract(id?: string) {
  const queryClient = useQueryClient();
  const isNew = !id || id === 'new';

  return useMutation({
    mutationFn: (body: ContractInput) =>
      isNew ? contractsApi.create(body) : contractsApi.update(id!, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      queryClient.invalidateQueries({ queryKey: ['contract', id] });
      queryClient.invalidateQueries({ queryKey: ['employee'] });
    },
  });
}
