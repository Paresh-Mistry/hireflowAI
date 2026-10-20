"use client";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/primitives";

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <ErrorState
      message={error.message && !error.digest ? error.message : "We could not load this page. Check your connection and try again."}
      action={<Button onClick={reset}>Try again</Button>}
    />
  );
}
