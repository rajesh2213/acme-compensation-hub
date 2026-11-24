"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  EMPLOYMENT_STATUSES,
  type EmploymentStatus,
  type RefDto,
} from "@/features/employees/types";
import { formatStatusLabel } from "../format";
import { hasActiveAnalyticsFilters } from "../url-params";
import type { AnalyticsFilters } from "../types";

export type AnalyticsFiltersProps = {
  filters: AnalyticsFilters;
  countries: RefDto[];
  departments: RefDto[];
  lookupsLoading?: boolean;
  onChange: (next: AnalyticsFilters) => void;
  onClear: () => void;
};

export function AnalyticsFiltersBar({
  filters,
  countries,
  departments,
  lookupsLoading = false,
  onChange,
  onClear,
}: AnalyticsFiltersProps) {
  const active = hasActiveAnalyticsFilters(filters);

  return (
    <div className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
      <div className="grid flex-1 gap-3 sm:grid-cols-3">
        <FilterField id="analytics-country" label="Country">
          <Select
            id="analytics-country"
            disabled={lookupsLoading}
            value={filters.countryId ?? ""}
            onChange={(event) =>
              onChange({
                ...filters,
                countryId: event.target.value || undefined,
              })
            }
          >
            <option value="">All countries</option>
            {countries.map((country) => (
              <option key={country.id} value={country.id}>
                {country.name}
              </option>
            ))}
          </Select>
        </FilterField>

        <FilterField id="analytics-department" label="Department">
          <Select
            id="analytics-department"
            disabled={lookupsLoading}
            value={filters.departmentId ?? ""}
            onChange={(event) =>
              onChange({
                ...filters,
                departmentId: event.target.value || undefined,
              })
            }
          >
            <option value="">All departments</option>
            {departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </Select>
        </FilterField>

        <FilterField id="analytics-status" label="Employment status">
          <Select
            id="analytics-status"
            value={filters.status ?? ""}
            onChange={(event) => {
              const value = event.target.value;
              onChange({
                ...filters,
                status: value
                  ? (value as EmploymentStatus)
                  : undefined,
              });
            }}
          >
            <option value="">All statuses</option>
            {EMPLOYMENT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {formatStatusLabel(status)}
              </option>
            ))}
          </Select>
        </FilterField>
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={!active}
        onClick={onClear}
      >
        Clear filters
      </Button>
    </div>
  );
}

function FilterField({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}
