import { useQuery } from '@tanstack/react-query'
import { departmentsApi } from '@/api/departments'

export const useDepartmentList = () =>
  useQuery({ queryKey: ['departments', 'full'], queryFn: departmentsApi.list })
