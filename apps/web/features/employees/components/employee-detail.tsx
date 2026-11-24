"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ApiError } from "@/lib/api-client";
import {
  formatHireDate,
  fullName,
  salarySummary,
} from "../format";
import { useEmployee } from "../hooks";
import { QueryError, QueryLoading } from "./query-state";
import { StatusBadge } from "./status-badge";

export function EmployeeDetailView({ employeeId }: { employeeId: string }) {
  const query = useEmployee(employeeId);

  if (query.isLoading) {
    return <QueryLoading label="Loading employee…" />;
  }

  if (query.error) {
    const notFound =
      query.error instanceof ApiError && query.error.status === 404;
    return (
      <div className="space-y-4">
        <BackLink />
        <QueryError
          message={
            notFound
              ? "Employee not found."
              : query.error instanceof ApiError
                ? query.error.message
                : "Unable to load employee"
          }
          onRetry={notFound ? undefined : () => void query.refetch()}
        />
      </div>
    );
  }

  const employee = query.data;
  if (!employee) {
    return (
      <div className="space-y-4">
        <BackLink />
        <QueryError message="Employee not found." />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <BackLink />
          <div>
            <h2 className="font-serif text-2xl font-semibold tracking-tight">
              {fullName(employee)}
            </h2>
            <p className="font-mono text-sm text-muted-foreground">
              {employee.employeeNumber}
            </p>
          </div>
        </div>
        <Button asChild variant="outline">
          <Link href={`/employees/${employee.id}/edit`}>
            <Pencil className="size-4" />
            Edit
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <dl className="grid gap-4 sm:grid-cols-2">
            <DetailItem label="Employee number" value={employee.employeeNumber} mono />
            <DetailItem label="Status" value={<StatusBadge status={employee.status} />} />
            <DetailItem label="First name" value={employee.firstName} />
            <DetailItem label="Last name" value={employee.lastName} />
            <DetailItem label="Job title" value={employee.jobTitle} />
            <DetailItem label="Hire date" value={formatHireDate(employee.hireDate)} />
            <DetailItem label="Department" value={employee.department.name} />
            <DetailItem label="Country" value={employee.country.name} />
          </dl>
          <Separator />
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Current salary
            </p>
            <p className="text-sm text-foreground">{salarySummary(employee)}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function BackLink() {
  return (
    <Link
      href="/employees"
      className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="size-3.5" />
      Back to employees
    </Link>
  );
}

function DetailItem({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="space-y-1">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className={mono ? "font-mono text-sm" : "text-sm text-foreground"}>
        {value}
      </dd>
    </div>
  );
}
