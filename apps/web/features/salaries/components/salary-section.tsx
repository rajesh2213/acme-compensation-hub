"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ApiError } from "@/lib/api-client";
import {
  formatEffectiveDate,
  formatSalaryHeadline,
} from "../format";
import {
  useAssignSalary,
  useCurrentSalary,
  useReviseSalary,
} from "../hooks";
import type { AssignSalaryInput, ReviseSalaryInput } from "../types";
import { RevisionHistory } from "./revision-history";
import { SalaryForm } from "./salary-form";

export function SalarySection({ employeeId }: { employeeId: string }) {
  const salaryQuery = useCurrentSalary(employeeId);
  const assignMutation = useAssignSalary(employeeId);
  const reviseMutation = useReviseSalary(employeeId);

  const [revising, setRevising] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);

  if (salaryQuery.isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Compensation</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading salary…</p>
        </CardContent>
      </Card>
    );
  }

  if (salaryQuery.error) {
    const notFound =
      salaryQuery.error instanceof ApiError &&
      salaryQuery.error.status === 404 &&
      salaryQuery.error.code === "NOT_FOUND";
    return (
      <Card>
        <CardHeader>
          <CardTitle>Compensation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-destructive" role="alert">
            {notFound
              ? "Employee not found."
              : salaryQuery.error instanceof ApiError
                ? salaryQuery.error.message
                : "Unable to load salary"}
          </p>
          {!notFound ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void salaryQuery.refetch()}
            >
              Retry
            </Button>
          ) : null}
        </CardContent>
      </Card>
    );
  }

  const salary = salaryQuery.data ?? null;

  async function handleAssign(values: AssignSalaryInput) {
    await assignMutation.mutateAsync(values);
    setHistoryPage(1);
  }

  async function handleRevise(
    values: AssignSalaryInput & { expectedVersion?: number },
  ) {
    const body = values as ReviseSalaryInput;
    await reviseMutation.mutateAsync(body);
    setRevising(false);
    setHistoryPage(1);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Compensation</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {salary === null ? (
          <div className="space-y-4">
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">
                No salary assigned
              </p>
              <p className="text-sm text-muted-foreground">
                Assign an annual amount, currency, and effective date.
              </p>
            </div>
            <SalaryForm
              mode="assign"
              submitting={assignMutation.isPending}
              onSubmit={handleAssign}
            />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1">
                <p className="font-mono text-lg font-medium tracking-tight text-foreground">
                  {formatSalaryHeadline(salary)}
                </p>
                <p className="text-sm text-muted-foreground">
                  Effective {formatEffectiveDate(salary.effectiveDate)} · version{" "}
                  {salary.version}
                </p>
              </div>
              {!revising ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setRevising(true)}
                >
                  Revise salary
                </Button>
              ) : null}
            </div>

            {revising ? (
              <div className="space-y-3 rounded-md border border-border bg-[color-mix(in_srgb,var(--muted)_35%,transparent)] p-4">
                <p className="text-sm font-medium text-foreground">
                  Revise compensation
                </p>
                <SalaryForm
                  mode="revise"
                  initialSalary={salary}
                  expectedVersion={salary.version}
                  submitting={reviseMutation.isPending}
                  onSubmit={handleRevise}
                  onCancel={() => setRevising(false)}
                />
              </div>
            ) : null}
          </div>
        )}

        {salary !== null ? (
          <>
            <Separator />

            <div className="space-y-3">
              <div>
                <h3 className="text-sm font-medium text-foreground">
                  Revision history
                </h3>
                <p className="text-xs text-muted-foreground">
                  Newest first · amounts shown in their recorded currency
                </p>
              </div>
              <RevisionHistory
                employeeId={employeeId}
                page={historyPage}
                onPageChange={setHistoryPage}
              />
            </div>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
