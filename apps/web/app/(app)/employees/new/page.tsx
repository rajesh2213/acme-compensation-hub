import type { Metadata } from "next";
import { EmployeeCreatePage } from "@/features/employees/components/employee-create-page";

export const metadata: Metadata = {
  title: "New employee",
};

export default function NewEmployeePage() {
  return <EmployeeCreatePage />;
}
