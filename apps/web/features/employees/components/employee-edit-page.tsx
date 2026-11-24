"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ApiError } from "@/lib/api-client";
import {
  useCountries,
  useDepartments,
  useEmployee,
  useUpdateEmployee,
} from "../hooks";
import { fullName } from "../format";
import { EmployeeForm } from "./employee-form";
import { QueryError, QueryLoading } from "./query-state";

export function EmployeeEditPage({ employeeId }: { employeeId: string }) {
  const router = useRouter();
  const employeeQuery = useEmployee(employeeId);
  const countriesQuery = useCountries();
  const departmentsQuery = useDepartments();
  const updateMutation = useUpdateEmployee(employeeId);

  if (
    employeeQuery.isLoading ||
    countriesQuery.isLoading ||
    departmentsQuery.isLoading
  ) {
    return <QueryLoading label="Loading employee…" />;
  }

  if (employeeQuery.error) {
    const notFound =
      employeeQuery.error instanceof ApiError &&
      employeeQuery.error.status === 404;
    return (
      <div className="space-y-4">
        <Link
          href="/employees"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Back to employees
        </Link>
        <QueryError
          message={
            notFound
              ? "Employee not found."
              : employeeQuery.error instanceof ApiError
                ? employeeQuery.error.message
                : "Unable to load employee"
          }
          onRetry={notFound ? undefined : () => void employeeQuery.refetch()}
        />
      </div>
    );
  }

  if (countriesQuery.error || departmentsQuery.error) {
    return (
      <QueryError
        message="Unable to load countries or departments."
        onRetry={() => {
          void countriesQuery.refetch();
          void departmentsQuery.refetch();
        }}
      />
    );
  }

  const employee = employeeQuery.data;
  if (!employee) {
    return <QueryError message="Employee not found." />;
  }

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Link
          href={`/employees/${employee.id}`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Back to detail
        </Link>
        <div>
          <h2 className="font-serif text-2xl font-semibold tracking-tight">
            Edit {fullName(employee)}
          </h2>
          <p className="font-mono text-sm text-muted-foreground">
            {employee.employeeNumber}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Employee details</CardTitle>
        </CardHeader>
        <CardContent>
          <EmployeeForm
            mode="edit"
            countries={countriesQuery.data ?? []}
            departments={departmentsQuery.data ?? []}
            initialEmployee={employee}
            submitting={updateMutation.isPending}
            onCancel={() => router.push(`/employees/${employee.id}`)}
            onSubmit={async (values) => {
              await updateMutation.mutateAsync(values);
              router.push(`/employees/${employee.id}`);
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
