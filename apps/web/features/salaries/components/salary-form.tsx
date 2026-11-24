"use client";

import { useEffect, type ReactNode } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { ApiError } from "@/lib/api-client";
import {
  salaryFormSchema,
  toAssignPayload,
  toRevisePayload,
  type SalaryFormValues,
} from "../schemas";
import { COMMON_CURRENCIES, type CurrentSalary } from "../types";

export type SalaryFormProps = {
  mode: "assign" | "revise";
  initialSalary?: CurrentSalary | null;
  expectedVersion?: number;
  submitting?: boolean;
  onSubmit: (
    values: ReturnType<typeof toAssignPayload> & { expectedVersion?: number },
  ) => Promise<void>;
  onCancel?: () => void;
};

function defaultsFromSalary(
  salary?: CurrentSalary | null,
): SalaryFormValues {
  if (!salary) {
    return {
      amount: "",
      currency: "",
      effectiveDate: "",
    };
  }
  return {
    amount: salary.amount,
    currency: salary.currency,
    effectiveDate: salary.effectiveDate,
  };
}

function currencyOptions(current: string): string[] {
  const set = new Set<string>(COMMON_CURRENCIES);
  if (current) set.add(current);
  return Array.from(set).sort();
}

export function SalaryForm({
  mode,
  initialSalary,
  expectedVersion,
  submitting = false,
  onSubmit,
  onCancel,
}: SalaryFormProps) {
  const {
    register,
    handleSubmit,
    setError,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SalaryFormValues>({
    resolver: zodResolver(salaryFormSchema),
    defaultValues: defaultsFromSalary(initialSalary),
  });

  useEffect(() => {
    if (mode === "revise" && initialSalary) {
      reset(defaultsFromSalary(initialSalary));
    }
  }, [initialSalary, mode, reset]);

  const busy = submitting || isSubmitting;
  const selectedCurrency = watch("currency");
  const options = currencyOptions(
    selectedCurrency || initialSalary?.currency || "",
  );

  async function submit(values: SalaryFormValues) {
    try {
      if (mode === "revise") {
        if (expectedVersion === undefined) {
          setError("root", {
            type: "server",
            message: "Current salary version is unavailable. Refresh and try again.",
          });
          return;
        }
        await onSubmit(toRevisePayload(values, expectedVersion));
      } else {
        await onSubmit(toAssignPayload(values));
      }
      if (mode === "assign") {
        reset(defaultsFromSalary(null));
      }
    } catch (error) {
      // Preserve form values on failure — do not reset.
      if (error instanceof ApiError) {
        if (error.code === "SALARY_VERSION_CONFLICT") {
          setError("root", {
            type: "server",
            message:
              "This salary was updated elsewhere. Refresh the current salary and try again.",
          });
          return;
        }
        if (error.code === "SALARY_ALREADY_EXISTS") {
          setError("root", {
            type: "server",
            message: error.message,
          });
          return;
        }
        if (error.code === "VALIDATION_ERROR") {
          setError("root", { type: "server", message: error.message });
          return;
        }
        setError("root", {
          type: "server",
          message: error.message || "Request failed",
        });
        return;
      }
      setError("root", {
        type: "server",
        message: "Request failed. Try again.",
      });
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit(submit)} noValidate>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field id="amount" label="Annual amount" error={errors.amount?.message}>
          <Input
            id="amount"
            inputMode="decimal"
            autoComplete="off"
            placeholder="120000.00"
            disabled={busy}
            {...register("amount")}
          />
        </Field>
        <Field id="currency" label="Currency" error={errors.currency?.message}>
          <Select id="currency" disabled={busy} {...register("currency")}>
            <option value="">Select currency</option>
            {options.map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          id="effectiveDate"
          label="Effective date"
          error={errors.effectiveDate?.message}
        >
          <Input
            id="effectiveDate"
            type="date"
            disabled={busy}
            {...register("effectiveDate")}
          />
        </Field>
      </div>

      {errors.root?.message ? (
        <p
          role="alert"
          className="rounded-md border border-[color-mix(in_srgb,var(--destructive)_35%,var(--border))] bg-[color-mix(in_srgb,var(--destructive)_8%,white)] px-3 py-2 text-sm text-destructive"
        >
          {errors.root.message}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={busy}>
          {busy
            ? mode === "assign"
              ? "Assigning…"
              : "Saving…"
            : mode === "assign"
              ? "Assign salary"
              : "Save revision"}
        </Button>
        {onCancel ? (
          <Button type="button" variant="outline" disabled={busy} onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
      </div>
    </form>
  );
}

function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
