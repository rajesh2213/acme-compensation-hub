import { formatEmployeeCount, formatMoneyDisplay } from "../format";
import type {
  CompensationByCountry,
  CompensationByDepartment,
} from "../types";

export function CompensationBreakdown({
  byCountryAndCurrency,
  byDepartmentAndCurrency,
}: {
  byCountryAndCurrency: CompensationByCountry[];
  byDepartmentAndCurrency: CompensationByDepartment[];
}) {
  return (
    <section
      aria-labelledby="compensation-breakdown-heading"
      className="space-y-5"
    >
      <div>
        <h2
          id="compensation-breakdown-heading"
          className="font-serif text-lg font-semibold tracking-tight"
        >
          Compensation breakdowns
        </h2>
        <p className="text-sm text-muted-foreground">
          Country and department figures stay currency-separated
        </p>
      </div>

      <BreakdownTable
        title="By country and currency"
        emptyLabel="No country compensation rows for these filters."
        rows={byCountryAndCurrency.map((row) => ({
          key: `${row.countryId}-${row.currency}`,
          group: row.countryName,
          currency: row.currency,
          employeeCount: row.employeeCount,
          totalAnnualPayroll: row.totalAnnualPayroll,
          averageAnnualSalary: row.averageAnnualSalary,
          minimumAnnualSalary: row.minimumAnnualSalary,
          maximumAnnualSalary: row.maximumAnnualSalary,
        }))}
      />

      <BreakdownTable
        title="By department and currency"
        emptyLabel="No department compensation rows for these filters."
        rows={byDepartmentAndCurrency.map((row) => ({
          key: `${row.departmentId}-${row.currency}`,
          group: row.departmentName,
          currency: row.currency,
          employeeCount: row.employeeCount,
          totalAnnualPayroll: row.totalAnnualPayroll,
          averageAnnualSalary: row.averageAnnualSalary,
          minimumAnnualSalary: row.minimumAnnualSalary,
          maximumAnnualSalary: row.maximumAnnualSalary,
        }))}
      />
    </section>
  );
}

type BreakdownRow = {
  key: string;
  group: string;
  currency: string;
  employeeCount: number;
  totalAnnualPayroll: string;
  averageAnnualSalary: string;
  minimumAnnualSalary: string;
  maximumAnnualSalary: string;
};

function BreakdownTable({
  title,
  emptyLabel,
  rows,
}: {
  title: string;
  emptyLabel: string;
  rows: BreakdownRow[];
}) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-foreground">{title}</h3>
      {rows.length === 0 ? (
        <p className="border border-dashed border-border px-3 py-5 text-sm text-muted-foreground">
          {emptyLabel}
        </p>
      ) : (
        <div className="overflow-x-auto border border-border">
          <table className="w-full min-w-[44rem] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <th className="px-3 py-2 font-medium">Group</th>
                <th className="px-3 py-2 font-medium">Currency</th>
                <th className="px-3 py-2 font-medium text-right">Employees</th>
                <th className="px-3 py-2 font-medium text-right">Total payroll</th>
                <th className="px-3 py-2 font-medium text-right">Average</th>
                <th className="px-3 py-2 font-medium text-right">Min</th>
                <th className="px-3 py-2 font-medium text-right">Max</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.key}
                  className="border-b border-border/70 last:border-0"
                >
                  <td className="px-3 py-2.5 text-foreground">{row.group}</td>
                  <td className="px-3 py-2.5 font-mono text-xs text-foreground">
                    {row.currency}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono tabular-nums text-foreground">
                    {formatEmployeeCount(row.employeeCount)}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs tabular-nums text-foreground">
                    {formatMoneyDisplay(row.totalAnnualPayroll, row.currency)}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs tabular-nums text-foreground">
                    {formatMoneyDisplay(row.averageAnnualSalary, row.currency)}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs tabular-nums text-foreground">
                    {formatMoneyDisplay(row.minimumAnnualSalary, row.currency)}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs tabular-nums text-foreground">
                    {formatMoneyDisplay(row.maximumAnnualSalary, row.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
