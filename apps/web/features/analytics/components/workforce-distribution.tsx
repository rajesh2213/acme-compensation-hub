import {
  distributionBarPercent,
  formatEmployeeCount,
  maxEmployeeCount,
} from "../format";
import type { DistributionBucket } from "../types";

export function WorkforceDistribution({
  byCountry,
  byDepartment,
}: {
  byCountry: DistributionBucket[];
  byDepartment: DistributionBucket[];
}) {
  return (
    <section
      aria-labelledby="workforce-distribution-heading"
      className="space-y-4"
    >
      <div>
        <h2
          id="workforce-distribution-heading"
          className="font-serif text-lg font-semibold tracking-tight"
        >
          Distribution
        </h2>
        <p className="text-sm text-muted-foreground">
          Employee counts by country and department
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <DistributionList title="By country" buckets={byCountry} />
        <DistributionList title="By department" buckets={byDepartment} />
      </div>
    </section>
  );
}

function DistributionList({
  title,
  buckets,
}: {
  title: string;
  buckets: DistributionBucket[];
}) {
  const max = maxEmployeeCount(buckets);

  if (buckets.length === 0) {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-foreground">{title}</h3>
        <p className="border border-dashed border-border px-3 py-6 text-sm text-muted-foreground">
          No employees in this view.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-foreground">{title}</h3>
      <ul className="space-y-2.5">
        {buckets.map((bucket) => {
          const percent = distributionBarPercent(bucket.employeeCount, max);
          return (
            <li key={bucket.id} className="space-y-1">
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="truncate text-foreground">{bucket.name}</span>
                <span className="shrink-0 font-mono tabular-nums text-muted-foreground">
                  {formatEmployeeCount(bucket.employeeCount)}
                </span>
              </div>
              <div
                className="h-1.5 w-full bg-muted"
                role="presentation"
                aria-hidden
              >
                <div
                  className="h-full bg-primary/80"
                  style={{ width: `${percent}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
