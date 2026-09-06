import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { attendanceApi } from '@/api/attendance';
import type { AttendanceInput } from '@/types/attendance';

/**
 * One page of attendance. The page is part of the key, so moving between pages
 * is a fresh fetch that TanStack caches, and `placeholderData` keeps the last
 * page on screen while the next arrives instead of flashing empty.
 */
export function useAttendance(params: {
  employeeId?: string;
  page?: number;
  pageSize?: number;
  status?: string;
} = {}) {
  const { employeeId, page = 1, pageSize = 25, status } = params;
  return useQuery({
    queryKey: ['attendance', employeeId ?? 'all', status ?? 'all', page, pageSize],
    queryFn: () => attendanceApi.list({ employeeId, page, pageSize, status }),
    placeholderData: previous => previous,
  });
}

function useInvalidate() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ['attendance'] });
    queryClient.invalidateQueries({ queryKey: ['employee'] });
  };
}

export function useCreateAttendance() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (body: AttendanceInput) => attendanceApi.create(body),
    onSuccess: invalidate,
  });
}

export function useUpdateAttendance() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: AttendanceInput }) =>
      attendanceApi.update(id, body),
    onSuccess: invalidate,
  });
}
