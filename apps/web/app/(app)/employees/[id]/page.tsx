import type { Metadata } from "next";
import { EmployeeDetailView } from "@/features/employees/components/employee-detail";

export const metadata: Metadata = {
  title: "Employee",
};

type EmployeeDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EmployeeDetailPage({
  params,
}: EmployeeDetailPageProps) {
  const { id } = await params;
  return <EmployeeDetailView employeeId={id} />;
}
