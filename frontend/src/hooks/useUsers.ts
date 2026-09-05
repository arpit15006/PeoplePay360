import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { usersApi } from '@/api/users'
import type { UserInput } from '@/types/user-admin'

export const useUsers = () => useQuery({ queryKey: ['users'], queryFn: usersApi.list })

function useInvalidate() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: ['users'] })
}

export function useCreateUser() {
  const invalidate = useInvalidate()
  return useMutation({ mutationFn: (body: UserInput) => usersApi.create(body), onSuccess: invalidate })
}

export function useUpdateUser() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<UserInput> }) => usersApi.update(id, body),
    onSuccess: invalidate,
  })
}

export function useDeleteUser() {
  const invalidate = useInvalidate()
  return useMutation({ mutationFn: (id: string) => usersApi.remove(id), onSuccess: invalidate })
}
