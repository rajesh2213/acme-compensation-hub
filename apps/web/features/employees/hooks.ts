"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from "@tanstack/react-query";
import { invalidateAnalyticsAfterEmployeeMutation } from "@/features/analytics/invalidate";
import {
  createEmployee,
  getEmployee,
  listCountries,
  listDepartments,
  listEmployees,
  updateEmployee,
} from "./api";
import { employeesKeys, referenceKeys } from "./query-keys";
import type {
  CreateEmployeeInput,
  EmployeeDetail,
  EmployeeListParams,
  EmployeeListResult,
  RefDto,
  UpdateEmployeeInput,
} from "./types";

export function useEmployeeList(
  params: EmployeeListParams,
): UseQueryResult<EmployeeListResult> {
  return useQuery({
    queryKey: employeesKeys.list(params),
    queryFn: ({ signal }) => listEmployees(params, signal),
    placeholderData: (previous) => previous,
  });
}

export function useEmployee(
  id: string | undefined,
): UseQueryResult<EmployeeDetail> {
  return useQuery({
    queryKey: employeesKeys.detail(id ?? ""),
    queryFn: ({ signal }) => getEmployee(id!, signal),
    enabled: Boolean(id),
  });
}

export function useCountries(): UseQueryResult<RefDto[]> {
  return useQuery({
    queryKey: referenceKeys.countries(),
    queryFn: ({ signal }) => listCountries(signal),
    staleTime: 5 * 60_000,
  });
}

export function useDepartments(): UseQueryResult<RefDto[]> {
  return useQuery({
    queryKey: referenceKeys.departments(),
    queryFn: ({ signal }) => listDepartments(signal),
    staleTime: 5 * 60_000,
  });
}

export function useCreateEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateEmployeeInput) => createEmployee(body),
    onSuccess: async (employee) => {
      await queryClient.invalidateQueries({ queryKey: employeesKeys.lists() });
      await invalidateAnalyticsAfterEmployeeMutation(queryClient);
      queryClient.setQueryData(employeesKeys.detail(employee.id), employee);
    },
  });
}

export function useUpdateEmployee(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateEmployeeInput) => updateEmployee(id, body),
    onSuccess: async (employee) => {
      await queryClient.invalidateQueries({ queryKey: employeesKeys.lists() });
      await invalidateAnalyticsAfterEmployeeMutation(queryClient);
      queryClient.setQueryData(employeesKeys.detail(employee.id), employee);
    },
  });
}
