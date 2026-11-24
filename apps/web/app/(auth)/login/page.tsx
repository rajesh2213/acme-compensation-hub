import { Suspense } from "react";
import type { Metadata } from "next";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LoginForm } from "@/features/auth/login-form";
import { RedirectIfAuthenticated } from "@/features/auth/require-auth";

export const metadata: Metadata = {
  title: "Sign in",
};

function LoginFallback() {
  return (
    <div className="flex min-h-svh items-center justify-center bg-background px-6">
      <p className="text-sm text-muted-foreground">Checking session…</p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <RedirectIfAuthenticated>
        <div className="flex min-h-svh items-center justify-center bg-background px-4 py-10">
          <div className="w-full max-w-md">
            <div className="mb-8 text-center">
              <p className="font-serif text-3xl font-semibold tracking-tight text-foreground">
                ACME
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Compensation Hub
              </p>
            </div>
            <Card>
              <CardHeader>
                <CardTitle>Sign in</CardTitle>
                <CardDescription>
                  Use your HR Manager account to continue.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <LoginForm />
              </CardContent>
            </Card>
          </div>
        </div>
      </RedirectIfAuthenticated>
    </Suspense>
  );
}
