import type { Metadata } from "next";
import { EmployeeEditPage } from "@/features/employees/components/employee-edit-page";

export const metadata: Metadata = {
  title: "Edit employee",
};

type EmployeeEditRouteProps = {
  params: Promise<{ id: string }>;
};

export default async function EmployeeEditRoute({
  params,
}: EmployeeEditRouteProps) {
  const { id } = await params;
  return <EmployeeEditPage employeeId={id} />;
}
