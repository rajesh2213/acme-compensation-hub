"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCountries, useCreateEmployee, useDepartments } from "../hooks";
import { EmployeeForm } from "./employee-form";
import { QueryError, QueryLoading } from "./query-state";

export function EmployeeCreatePage() {
  const router = useRouter();
  const countriesQuery = useCountries();
  const departmentsQuery = useDepartments();
  const createMutation = useCreateEmployee();

  if (countriesQuery.isLoading || departmentsQuery.isLoading) {
    return <QueryLoading label="Loading form…" />;
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

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Link
          href="/employees"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Back to employees
        </Link>
        <div>
          <h2 className="font-serif text-2xl font-semibold tracking-tight">
            New employee
          </h2>
          <p className="text-sm text-muted-foreground">
            Create an employee record. Salary is assigned separately later.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Employee details</CardTitle>
        </CardHeader>
        <CardContent>
          <EmployeeForm
            mode="create"
            countries={countriesQuery.data ?? []}
            departments={departmentsQuery.data ?? []}
            submitting={createMutation.isPending}
            onCancel={() => router.push("/employees")}
            onSubmit={async (values) => {
              const employee = await createMutation.mutateAsync(values);
              router.push(`/employees/${employee.id}`);
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
