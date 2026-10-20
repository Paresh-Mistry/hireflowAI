import { Card, Skeleton } from "@/components/ui/primitives";

export default function Loading() {
  return (
    <div className="space-y-6" role="status" aria-live="polite" aria-label="Loading">
      <div className="space-y-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-9 w-72" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="space-y-3 p-5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-9 w-16" />
            <Skeleton className="h-3 w-40" />
          </Card>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="p-5 lg:col-span-3"><Skeleton className="h-64 w-full" /></Card>
        <Card className="p-5 lg:col-span-2"><Skeleton className="h-64 w-full" /></Card>
      </div>
      <span className="sr-only">Loading content…</span>
    </div>
  );
}
