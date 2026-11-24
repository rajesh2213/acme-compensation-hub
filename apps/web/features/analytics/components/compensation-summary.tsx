import { formatEmployeeCount, formatMoneyDisplay } from "../format";
import type { CompensationStats } from "../types";

export function CompensationSummary({
  byCurrency,
}: {
  byCurrency: CompensationStats[];
}) {
  return (
    <section
      aria-labelledby="compensation-summary-heading"
      className="space-y-3"
    >
      <div>
        <h2
          id="compensation-summary-heading"
          className="font-serif text-lg font-semibold tracking-tight"
        >
          Compensation by currency
        </h2>
        <p className="text-sm text-muted-foreground">
          Annual payroll figures are never combined across currencies
        </p>
      </div>

      {byCurrency.length === 0 ? (
        <p className="border border-dashed border-border px-3 py-6 text-sm text-muted-foreground">
          No salaried employees match the current filters.
        </p>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {byCurrency.map((stats) => (
            <CurrencyPanel key={stats.currency} stats={stats} />
          ))}
        </div>
      )}
    </section>
  );
}

function CurrencyPanel({ stats }: { stats: CompensationStats }) {
  const rows = [
    {
      label: "Employees with salary",
      value: formatEmployeeCount(stats.employeeCount),
    },
    {
      label: "Total annual payroll",
      value: formatMoneyDisplay(stats.totalAnnualPayroll, stats.currency),
    },
    {
      label: "Average annual salary",
      value: formatMoneyDisplay(stats.averageAnnualSalary, stats.currency),
    },
    {
      label: "Minimum annual salary",
      value: formatMoneyDisplay(stats.minimumAnnualSalary, stats.currency),
    },
    {
      label: "Maximum annual salary",
      value: formatMoneyDisplay(stats.maximumAnnualSalary, stats.currency),
    },
  ];

  return (
    <article
      className="border border-border bg-card"
      aria-label={`${stats.currency} compensation`}
    >
      <header className="border-b border-border px-4 py-3">
        <p className="font-mono text-sm font-medium tracking-wide text-primary">
          {stats.currency}
        </p>
      </header>
      <dl className="divide-y divide-border">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex items-baseline justify-between gap-3 px-4 py-2.5"
          >
            <dt className="text-sm text-muted-foreground">{row.label}</dt>
            <dd className="font-mono text-sm tabular-nums text-foreground">
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
    </article>
  );
}
