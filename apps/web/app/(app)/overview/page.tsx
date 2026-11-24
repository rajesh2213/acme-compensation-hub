import type { Metadata } from "next";
import { PlaceholderPage } from "@/components/layout/placeholder-page";

export const metadata: Metadata = {
  title: "Overview",
};

export default function OverviewPage() {
  return (
    <PlaceholderPage
      title="Overview"
      description="Organizational pay snapshot and shortcuts will live here."
    />
  );
}
