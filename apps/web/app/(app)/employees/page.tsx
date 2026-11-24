import { Suspense } from "react";
import type { Metadata } from "next";
import { EmployeeDirectory } from "@/features/employees/components/employee-directory";
import { QueryLoading } from "@/features/employees/components/query-state";

export const metadata: Metadata = {
  title: "Employees",
};

export default function EmployeesPage() {
  return (
    <Suspense fallback={<QueryLoading label="Loading employees…" />}>
      <EmployeeDirectory />
    </Suspense>
  );
}
