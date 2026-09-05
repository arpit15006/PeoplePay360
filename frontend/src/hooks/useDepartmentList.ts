import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { departmentsApi } from '@/api/departments'
import type { DepartmentInput } from '@/types/department'

export const useDepartmentList = () =>
  useQuery({ queryKey: ['departments', 'full'], queryFn: departmentsApi.list })

function useInvalidateDepartments() {
  const queryClient = useQueryClient()
  return () => {
    queryClient.invalidateQueries({ queryKey: ['departments'] })
    // Headcount and the department chart both read from this data.
    queryClient.invalidateQueries({ queryKey: ['employees'] })
    queryClient.invalidateQueries({ queryKey: ['dashboard'] })
  }
}

export function useSaveDepartment() {
  const invalidate = useInvalidateDepartments()
  return useMutation({
    mutationFn: ({ id, body }: { id?: string; body: DepartmentInput }) =>
      id ? departmentsApi.update(id, body) : departmentsApi.create(body),
    onSuccess: invalidate,
  })
}

export function useDeleteDepartment() {
  const invalidate = useInvalidateDepartments()
  return useMutation({ mutationFn: departmentsApi.remove, onSuccess: invalidate })
}
