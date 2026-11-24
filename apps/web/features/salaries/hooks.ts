"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from "@tanstack/react-query";
import { invalidateAnalyticsAfterSalaryMutation } from "@/features/analytics/invalidate";
import { employeesKeys } from "@/features/employees/query-keys";
import {
  assignSalary,
  getCurrentSalary,
  listSalaryRevisions,
  reviseSalary,
} from "./api";
import { salariesKeys } from "./query-keys";
import type {
  AssignSalaryInput,
  CurrentSalary,
  ReviseSalaryInput,
  SalaryRevisionListResult,
  SalaryRevisionsParams,
} from "./types";

async function invalidateSalaryQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  employeeId: string,
) {
  await Promise.all([
    queryClient.invalidateQueries({
      queryKey: salariesKeys.current(employeeId),
    }),
    queryClient.invalidateQueries({
      queryKey: salariesKeys.revisionsForEmployee(employeeId),
    }),
    queryClient.invalidateQueries({
      queryKey: employeesKeys.detail(employeeId),
    }),
    invalidateAnalyticsAfterSalaryMutation(queryClient),
  ]);
}

export function useCurrentSalary(
  employeeId: string | undefined,
): UseQueryResult<CurrentSalary | null> {
  return useQuery({
    queryKey: salariesKeys.current(employeeId ?? ""),
    queryFn: ({ signal }) => getCurrentSalary(employeeId!, signal),
    enabled: Boolean(employeeId),
  });
}

export function useSalaryRevisions(
  employeeId: string | undefined,
  params: SalaryRevisionsParams,
): UseQueryResult<SalaryRevisionListResult> {
  return useQuery({
    queryKey: salariesKeys.revisions(employeeId ?? "", params),
    queryFn: ({ signal }) => listSalaryRevisions(employeeId!, params, signal),
    enabled: Boolean(employeeId),
    placeholderData: (previous) => previous,
  });
}

export function useAssignSalary(employeeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: AssignSalaryInput) => assignSalary(employeeId, body),
    onSuccess: async (salary) => {
      queryClient.setQueryData(salariesKeys.current(employeeId), salary);
      await invalidateSalaryQueries(queryClient, employeeId);
    },
  });
}

export function useReviseSalary(employeeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: ReviseSalaryInput) => reviseSalary(employeeId, body),
    onSuccess: async (salary) => {
      queryClient.setQueryData(salariesKeys.current(employeeId), salary);
      await invalidateSalaryQueries(queryClient, employeeId);
    },
  });
}
