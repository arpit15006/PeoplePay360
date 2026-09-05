import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { attendanceApi } from '@/api/attendance';
import type { AttendanceInput } from '@/types/attendance';

export function useAttendance(employeeId?: string) {
  return useQuery({
    queryKey: ['attendance', employeeId ?? 'all'],
    queryFn: () => attendanceApi.list(employeeId),
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
