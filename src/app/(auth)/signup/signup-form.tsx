"use client";
import { useActionState } from "react";
import { signUp, type SignupState } from "@/features/auth/actions";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";

export function SignupForm() {
  const [state, action, pending] = useActionState<SignupState, FormData>(signUp, {});
  return (
    <form action={action} className="mt-8 space-y-4" noValidate>
      <Field label="Full name" htmlFor="full_name" error={state.fieldErrors?.full_name}>
        <Input id="full_name" name="full_name" autoComplete="name" required />
      </Field>
      <Field label="Email" htmlFor="email" error={state.fieldErrors?.email}>
        <Input id="email" name="email" type="email" autoComplete="email" required placeholder="you@company.com" />
      </Field>
      <Field label="Password" htmlFor="password" error={state.fieldErrors?.password} hint="At least 8 characters">
        <Input id="password" name="password" type="password" autoComplete="new-password" required />
      </Field>
      <Field label="Confirm password" htmlFor="confirm" error={state.fieldErrors?.confirm}>
        <Input id="confirm" name="confirm" type="password" autoComplete="new-password" required />
      </Field>
      {state.error && (
        <p role="alert" className="rounded-[10px] bg-error-bg px-3 py-2 text-sm font-medium text-error-fg">
          {state.error}
        </p>
      )}
      {state.message && (
        <p role="status" className="rounded-[10px] bg-success-bg px-3 py-2 text-sm font-medium text-success-fg">
          {state.message}
        </p>
      )}
      <Button type="submit" className="w-full" loading={pending}>
        Create account
      </Button>
    </form>
  );
}
