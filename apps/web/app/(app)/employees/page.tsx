import type { Metadata } from "next";
import { PlaceholderPage } from "@/components/layout/placeholder-page";

export const metadata: Metadata = {
  title: "Employees",
};

export default function EmployeesPage() {
  return (
    <PlaceholderPage
      title="Employees"
      description="Search, filter, and manage employee records in a later milestone."
    />
  );
}
