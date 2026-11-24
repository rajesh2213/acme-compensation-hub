import { cn } from "@/lib/utils";
import { formatStatus } from "../format";
import type { EmploymentStatus } from "../types";

export function StatusBadge({ status }: { status: EmploymentStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-sm border px-1.5 py-0.5 text-xs font-medium",
        status === "ACTIVE" &&
          "border-[color-mix(in_srgb,var(--primary)_35%,var(--border))] bg-[color-mix(in_srgb,var(--primary)_10%,white)] text-[color-mix(in_srgb,var(--primary)_85%,black)]",
        status === "INACTIVE" &&
          "border-border bg-muted text-muted-foreground",
        status === "TERMINATED" &&
          "border-[color-mix(in_srgb,var(--destructive)_30%,var(--border))] bg-[color-mix(in_srgb,var(--destructive)_8%,white)] text-destructive",
      )}
    >
      {formatStatus(status)}
    </span>
  );
}
