import { formatEmployeeCount } from "../format";
import type { OverviewAnalytics } from "../types";

export function WorkforceSummary({ data }: { data: OverviewAnalytics }) {
  const metrics = [
    { label: "Total employees", value: data.totalEmployees },
    { label: "Active", value: data.activeEmployees },
    { label: "Inactive", value: data.inactiveEmployees },
    { label: "Terminated", value: data.terminatedEmployees },
  ];

  return (
    <section aria-labelledby="workforce-summary-heading" className="space-y-3">
      <h2
        id="workforce-summary-heading"
        className="font-serif text-lg font-semibold tracking-tight"
      >
        Workforce
      </h2>
      <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric) => (
          <div
            key={metric.label}
            className="border border-border bg-card px-4 py-3"
          >
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {metric.label}
            </dt>
            <dd className="mt-1 font-mono text-2xl font-medium tabular-nums text-foreground">
              {formatEmployeeCount(metric.value)}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
