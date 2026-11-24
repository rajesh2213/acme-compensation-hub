import type { Metadata } from "next";
import { PlaceholderPage } from "@/components/layout/placeholder-page";

export const metadata: Metadata = {
  title: "Compensation",
};

export default function CompensationPage() {
  return (
    <PlaceholderPage
      title="Compensation"
      description="Currency-separated analytics and pay summaries will live here."
    />
  );
}
