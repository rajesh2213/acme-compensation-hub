import { Button } from "@/components/ui/button";

export function QueryLoading({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex min-h-40 items-center justify-center rounded-md border border-border bg-card px-4 py-10">
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

export function QueryError({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex min-h-40 flex-col items-center justify-center gap-3 rounded-md border border-border bg-card px-4 py-10 text-center">
      <p className="text-sm text-destructive" role="alert">
        {message}
      </p>
      {onRetry ? (
        <Button type="button" variant="outline" onClick={onRetry}>
          Retry
        </Button>
      ) : null}
    </div>
  );
}

export function QueryEmpty({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex min-h-40 flex-col items-center justify-center gap-1 rounded-md border border-dashed border-border bg-card px-4 py-10 text-center">
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="max-w-md text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
