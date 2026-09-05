import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { timeOffApi } from '@/api/timeoff';
import type { TimeOffType } from '@/types/timeoff';

/** Approving a request changes allocations too, so refresh both. */
function useInvalidateTimeOff() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ['timeoff'] });
    queryClient.invalidateQueries({ queryKey: ['employee'] });
  };
}

export function useTimeOffTypes() {
  return useQuery({ queryKey: ['timeoff', 'types'], queryFn: timeOffApi.types });
}

export function useTimeOffAllocations(employeeId?: string) {
  return useQuery({
    queryKey: ['timeoff', 'allocations', employeeId ?? 'all'],
    queryFn: () => timeOffApi.allocations(employeeId),
  });
}

export function useTimeOffRequests(employeeId?: string) {
  return useQuery({
    queryKey: ['timeoff', 'requests', employeeId ?? 'all'],
    queryFn: () => timeOffApi.requests(employeeId),
  });
}

export function useCreateRequest() {
  const invalidate = useInvalidateTimeOff();
  return useMutation({ mutationFn: timeOffApi.createRequest, onSuccess: invalidate });
}

export function useDecideRequest() {
  const invalidate = useInvalidateTimeOff();
  return useMutation({
    mutationFn: ({ id, decision }: { id: string; decision: 'approve' | 'refuse' }) =>
      decision === 'approve' ? timeOffApi.approve(id) : timeOffApi.refuse(id),
    onSuccess: invalidate,
  });
}

export function useCreateAllocation() {
  const invalidate = useInvalidateTimeOff();
  return useMutation({ mutationFn: timeOffApi.createAllocation, onSuccess: invalidate });
}

/** Correcting a balance: the days granted, its validity year, or its approval. */
export function useUpdateAllocation() {
  const invalidate = useInvalidateTimeOff();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      timeOffApi.updateAllocation(id, body),
    onSuccess: invalidate,
  });
}

export function useSaveType(id?: string) {
  const invalidate = useInvalidateTimeOff();
  return useMutation({
    mutationFn: (body: Partial<TimeOffType>) =>
      id ? timeOffApi.updateType(id, body) : timeOffApi.createType(body),
    onSuccess: invalidate,
  });
}
