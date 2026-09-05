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

export function useSalaryStructures() {
  return useQuery({ queryKey: ['salary-structures'], queryFn: contractsApi.salaryStructures });
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
