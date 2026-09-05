import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { salaryApi } from '@/api/salary';
import type { SalaryRule, SalaryStructure } from '@/types/payroll';

function useInvalidateSalary() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ['salary'] });
    queryClient.invalidateQueries({ queryKey: ['salary-structures'] });
  };
}

export function useSalaryStructures() {
  return useQuery({ queryKey: ['salary', 'structures'], queryFn: salaryApi.structures });
}

export function useSalaryStructure(id: string | undefined) {
  return useQuery({
    queryKey: ['salary', 'structure', id],
    queryFn: () => salaryApi.structure(id!),
    enabled: Boolean(id) && id !== 'new',
  });
}

export function useSalaryRules(structureId?: string) {
  return useQuery({
    queryKey: ['salary', 'rules', structureId ?? 'all'],
    queryFn: () => salaryApi.rules(structureId),
  });
}

export function useSaveStructure(id?: string) {
  const invalidate = useInvalidateSalary();
  return useMutation({
    mutationFn: (body: Partial<SalaryStructure>) => salaryApi.saveStructure(id, body),
    onSuccess: invalidate,
  });
}

/**
 * Create or update a structure. The id travels with the call rather than the
 * hook so one dialog can serve both, the way the rule dialog does.
 */
export function useSaveStructureById() {
  const invalidate = useInvalidateSalary();
  return useMutation({
    mutationFn: ({ id, body }: { id?: string; body: Partial<SalaryStructure> }) =>
      salaryApi.saveStructure(id, body),
    onSuccess: invalidate,
  });
}

export function useSaveRule() {
  const invalidate = useInvalidateSalary();
  return useMutation({
    mutationFn: ({ id, body }: { id?: string; body: Partial<SalaryRule> }) =>
      salaryApi.saveRule(id, body),
    onSuccess: invalidate,
  });
}

export function useDeleteStructure() {
  const invalidate = useInvalidateSalary();
  return useMutation({ mutationFn: salaryApi.deleteStructure, onSuccess: invalidate });
}

export function useDeleteRule() {
  const invalidate = useInvalidateSalary();
  return useMutation({ mutationFn: salaryApi.deleteRule, onSuccess: invalidate });
}
