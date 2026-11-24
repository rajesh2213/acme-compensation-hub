"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useAuth } from "./auth-provider";

function SessionStatusMessage({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-svh items-center justify-center bg-background px-6">
      <p className="text-sm text-muted-foreground">{children}</p>
    </div>
  );
}

function SessionErrorPanel({
  message,
  onRetry,
  retrying,
}: {
  message: string;
  onRetry: () => void;
  retrying: boolean;
}) {
  return (
    <div className="flex min-h-svh items-center justify-center bg-background px-6">
      <div className="w-full max-w-md space-y-4 text-center">
        <div className="space-y-2">
          <p className="font-serif text-xl font-semibold tracking-tight text-foreground">
            Session unavailable
          </p>
          <p className="text-sm text-muted-foreground" role="alert">
            {message}
          </p>
        </div>
        <Button type="button" onClick={onRetry} disabled={retrying}>
          {retrying ? "Retrying…" : "Retry"}
        </Button>
      </div>
    </div>
  );
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { status, error, refreshSession } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      const next = pathname && pathname !== "/" ? pathname : "/overview";
      router.replace(`/login?next=${encodeURIComponent(next)}`);
    }
  }, [status, router, pathname]);

  async function onRetry() {
    setRetrying(true);
    try {
      await refreshSession();
    } finally {
      setRetrying(false);
    }
  }

  if (status === "loading") {
    return <SessionStatusMessage>Restoring session…</SessionStatusMessage>;
  }

  if (status === "error") {
    return (
      <SessionErrorPanel
        message={
          error ??
          "Unable to verify your session. Check your connection and try again."
        }
        onRetry={() => void onRetry()}
        retrying={retrying}
      />
    );
  }

  if (status !== "authenticated") {
    return <SessionStatusMessage>Redirecting to sign in…</SessionStatusMessage>;
  }

  return <>{children}</>;
}

export function RedirectIfAuthenticated({ children }: { children: ReactNode }) {
  const { status, error, refreshSession } = useAuth();
  const router = useRouter();
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/overview");
    }
  }, [status, router]);

  async function onRetry() {
    setRetrying(true);
    try {
      await refreshSession();
    } finally {
      setRetrying(false);
    }
  }

  if (status === "loading") {
    return <SessionStatusMessage>Checking session…</SessionStatusMessage>;
  }

  if (status === "error") {
    return (
      <SessionErrorPanel
        message={
          error ??
          "Unable to verify your session. Check your connection and try again."
        }
        onRetry={() => void onRetry()}
        retrying={retrying}
      />
    );
  }

  if (status === "authenticated") {
    return <SessionStatusMessage>Redirecting…</SessionStatusMessage>;
  }

  return <>{children}</>;
}
