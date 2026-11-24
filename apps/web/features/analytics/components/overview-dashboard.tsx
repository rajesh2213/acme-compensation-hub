"use client";

import { useMemo, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api-client";
import {
  useCountries,
  useDepartments,
} from "@/features/employees/hooks";
import {
  useCompensationAnalytics,
  useOverviewAnalytics,
} from "../hooks";
import {
  analyticsFiltersEqual,
  hasActiveAnalyticsFilters,
  parseAnalyticsFilters,
  serializeAnalyticsFilters,
} from "../url-params";
import type { AnalyticsFilters } from "../types";
import { AnalyticsFiltersBar } from "./analytics-filters";
import { CompensationBreakdown } from "./compensation-breakdown";
import { CompensationSummary } from "./compensation-summary";
import { WorkforceDistribution } from "./workforce-distribution";
import { WorkforceSummary } from "./workforce-summary";

export function OverviewDashboard() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const filters = useMemo(
    () => parseAnalyticsFilters(new URLSearchParams(searchParams.toString())),
    [searchParams],
  );

  const countriesQuery = useCountries();
  const departmentsQuery = useDepartments();
  const overviewQuery = useOverviewAnalytics(filters);
  const compensationQuery = useCompensationAnalytics(filters);

  function pushFilters(next: AnalyticsFilters) {
    if (analyticsFiltersEqual(next, filters)) return;
    const qs = serializeAnalyticsFilters(next).toString();
    startTransition(() => {
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    });
  }

  function clearFilters() {
    if (!hasActiveAnalyticsFilters(filters)) return;
    startTransition(() => {
      router.replace(pathname, { scroll: false });
    });
  }

  const lookupsLoading =
    countriesQuery.isLoading || departmentsQuery.isLoading;

  // Avoid mismatched sections: wait until both queries for the current
  // filters have settled (no placeholder/previous-filter bleed).
  const overviewPending = overviewQuery.isPending;
  const compensationPending = compensationQuery.isPending;
  const eitherPending = overviewPending || compensationPending;

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h1 className="font-serif text-2xl font-semibold tracking-tight">
          Overview
        </h1>
        <p className="text-sm text-muted-foreground">
          Workforce headcount and currency-separated compensation for the
          current filter set.
        </p>
      </header>

      <AnalyticsFiltersBar
        filters={filters}
        countries={countriesQuery.data ?? []}
        departments={departmentsQuery.data ?? []}
        lookupsLoading={lookupsLoading}
        onChange={pushFilters}
        onClear={clearFilters}
      />

      {eitherPending ? (
        <DashboardSkeleton />
      ) : (
        <div className="space-y-8">
          <WorkforceBlock
            query={overviewQuery}
            onRetry={() => void overviewQuery.refetch()}
          />
          <CompensationBlock
            query={compensationQuery}
            onRetry={() => void compensationQuery.refetch()}
          />
        </div>
      )}
    </div>
  );
}

function WorkforceBlock({
  query,
  onRetry,
}: {
  query: ReturnType<typeof useOverviewAnalytics>;
  onRetry: () => void;
}) {
  if (query.error) {
    return (
      <SectionError
        title="Workforce"
        message={errorMessage(query.error)}
        onRetry={onRetry}
      />
    );
  }

  if (!query.data) {
    return (
      <SectionError
        title="Workforce"
        message="Unable to load workforce analytics."
        onRetry={onRetry}
      />
    );
  }

  return (
    <div className="space-y-6">
      <WorkforceSummary data={query.data} />
      <WorkforceDistribution
        byCountry={query.data.byCountry}
        byDepartment={query.data.byDepartment}
      />
    </div>
  );
}

function CompensationBlock({
  query,
  onRetry,
}: {
  query: ReturnType<typeof useCompensationAnalytics>;
  onRetry: () => void;
}) {
  if (query.error) {
    return (
      <SectionError
        title="Compensation"
        message={errorMessage(query.error)}
        onRetry={onRetry}
      />
    );
  }

  if (!query.data) {
    return (
      <SectionError
        title="Compensation"
        message="Unable to load compensation analytics."
        onRetry={onRetry}
      />
    );
  }

  return (
    <div className="space-y-6">
      <CompensationSummary byCurrency={query.data.byCurrency} />
      <CompensationBreakdown
        byCountryAndCurrency={query.data.byCountryAndCurrency}
        byDepartmentAndCurrency={query.data.byDepartmentAndCurrency}
      />
    </div>
  );
}

function SectionError({
  title,
  message,
  onRetry,
}: {
  title: string;
  message: string;
  onRetry: () => void;
}) {
  return (
    <section className="space-y-3 border border-border bg-card px-4 py-6">
      <h2 className="font-serif text-lg font-semibold tracking-tight">{title}</h2>
      <p className="text-sm text-destructive" role="alert">
        {message}
      </p>
      <Button type="button" variant="outline" size="sm" onClick={onRetry}>
        Retry
      </Button>
    </section>
  );
}

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  return "Unable to load analytics";
}

function DashboardSkeleton() {
  return (
    <div className="space-y-8" aria-busy="true" aria-live="polite">
      <p className="sr-only">Loading analytics…</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-20 animate-pulse border border-border bg-muted/60"
          />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="h-48 animate-pulse border border-border bg-muted/50" />
        <div className="h-48 animate-pulse border border-border bg-muted/50" />
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <div className="h-56 animate-pulse border border-border bg-muted/50" />
        <div className="h-56 animate-pulse border border-border bg-muted/50" />
      </div>
    </div>
  );
}
