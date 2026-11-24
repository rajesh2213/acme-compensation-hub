"use client";

import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api-client";
import {
  formatChangedAt,
  formatEffectiveDate,
  formatNewSalary,
  formatPreviousSalary,
} from "../format";
import { useSalaryRevisions } from "../hooks";
import { REVISION_PAGE_SIZE } from "../types";

export function RevisionHistory({
  employeeId,
  page,
  onPageChange,
}: {
  employeeId: string;
  page: number;
  onPageChange: (page: number) => void;
}) {
  const query = useSalaryRevisions(employeeId, {
    page,
    limit: REVISION_PAGE_SIZE,
  });

  if (query.isLoading) {
    return (
      <p className="py-6 text-sm text-muted-foreground">Loading revisions…</p>
    );
  }

  if (query.error) {
    const message =
      query.error instanceof ApiError
        ? query.error.message
        : "Unable to load revision history";
    return (
      <div className="space-y-3 py-4">
        <p className="text-sm text-destructive" role="alert">
          {message}
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void query.refetch()}
        >
          Retry
        </Button>
      </div>
    );
  }

  const data = query.data;
  if (!data || data.revisions.length === 0) {
    return (
      <p className="py-6 text-sm text-muted-foreground">
        No revisions recorded yet.
      </p>
    );
  }

  const canPrev = page > 1;
  const canNext = page < data.totalPages;

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[40rem] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <th className="px-2 py-2 font-medium">Changed</th>
              <th className="px-2 py-2 font-medium">Previous</th>
              <th className="px-2 py-2 font-medium">New</th>
              <th className="px-2 py-2 font-medium">Effective</th>
              <th className="px-2 py-2 font-medium">By</th>
            </tr>
          </thead>
          <tbody>
            {data.revisions.map((revision) => (
              <tr
                key={revision.id}
                className="border-b border-border/70 last:border-0"
              >
                <td className="px-2 py-2.5 align-top text-foreground">
                  {formatChangedAt(revision.changedAt)}
                </td>
                <td className="px-2 py-2.5 align-top font-mono text-xs text-muted-foreground">
                  {formatPreviousSalary(revision)}
                </td>
                <td className="px-2 py-2.5 align-top font-mono text-xs text-foreground">
                  {formatNewSalary(revision)}
                </td>
                <td className="px-2 py-2.5 align-top text-foreground">
                  {formatEffectiveDate(revision.effectiveDate)}
                </td>
                <td className="px-2 py-2.5 align-top text-foreground">
                  <span className="block">{revision.changedBy.displayName}</span>
                  <span className="block text-xs text-muted-foreground">
                    {revision.changedBy.email}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data.totalPages > 1 ? (
        <div className="flex items-center justify-between gap-3 pt-1">
          <p className="text-xs text-muted-foreground">
            Page {data.page} of {data.totalPages} · {data.total} revisions
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!canPrev}
              onClick={() => onPageChange(page - 1)}
            >
              Previous
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!canNext}
              onClick={() => onPageChange(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
