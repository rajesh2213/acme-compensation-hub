import { Suspense } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { RequireAuth } from "@/features/auth/require-auth";

function ShellFallback() {
  return (
    <div className="flex min-h-svh items-center justify-center bg-background px-6">
      <p className="text-sm text-muted-foreground">Loading workspace…</p>
    </div>
  );
}

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<ShellFallback />}>
      <RequireAuth>
        <AppShell>{children}</AppShell>
      </RequireAuth>
    </Suspense>
  );
}
