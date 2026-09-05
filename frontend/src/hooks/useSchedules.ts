import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { schedulesApi } from '@/api/schedules';
import type { ScheduleInput } from '@/types/schedule';

export function useSchedulesList() {
  return useQuery({ queryKey: ['schedules'], queryFn: schedulesApi.list });
}

export function useSchedule(id: string | undefined) {
  return useQuery({
    queryKey: ['schedule', id],
    queryFn: () => schedulesApi.getById(id!),
    enabled: Boolean(id) && id !== 'new',
  });
}

export function useSaveSchedule(id?: string) {
  const queryClient = useQueryClient();
  const isNew = !id || id === 'new';

  return useMutation({
    mutationFn: (body: ScheduleInput) =>
      isNew ? schedulesApi.create(body) : schedulesApi.update(id!, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      queryClient.invalidateQueries({ queryKey: ['schedule', id] });
    },
  });
}
