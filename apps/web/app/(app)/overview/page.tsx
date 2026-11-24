import { Suspense } from "react";
import type { Metadata } from "next";
import { OverviewDashboard } from "@/features/analytics/components/overview-dashboard";

export const metadata: Metadata = {
  title: "Overview",
};

function OverviewFallback() {
  return (
    <div className="space-y-4" aria-busy="true">
      <div className="h-8 w-40 animate-pulse bg-muted" />
      <div className="h-10 w-full animate-pulse bg-muted/70" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-20 animate-pulse border border-border bg-muted/60"
          />
        ))}
      </div>
    </div>
  );
}

export default function OverviewPage() {
  return (
    <Suspense fallback={<OverviewFallback />}>
      <OverviewDashboard />
    </Suspense>
  );
}
