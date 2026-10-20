import * as React from "react";
import Link from "next/link";
import { AlertTriangle, Inbox } from "lucide-react";
import { STAGE_META, type Stage } from "@/config/constants";
import { cn, initials, tintFor } from "@/lib/utils/index";
import { LineShadowText } from "./line-shadow-text";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-[14px] border border-line bg-card", className)} {...props} />;
}

export function Badge({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold", className)}
      {...props}
    />
  );
}

export function StageBadge({ stage, className }: { stage: Stage; className?: string }) {
  const meta = STAGE_META[stage];
  return (
    <Badge className={cn(meta.badge, className)}>
      <span className="mr-1.5 h-1.5 w-1.5 rounded-full" style={{ background: meta.color }} aria-hidden />
      {meta.label}
    </Badge>
  );
}

export function SkillBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-md border border-line bg-[#faf9f6] px-2 py-0.5 text-xs font-medium text-ink">
      {children}
    </span>
  );
}

export function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  return (
    <span
      aria-hidden
      className="inline-flex shrink-0 items-center justify-center rounded-full font-bold text-ink"
      style={{ width: size, height: size, background: tintFor(name), fontSize: size * 0.36 }}
    >
      {initials(name)}
    </span>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton", className)} aria-hidden />;
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <LineShadowText className="italic text-[28px] font-medium leading-tight tracking-tight text-ink" shadowColor={"black"}>
          {title}
        </LineShadowText>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon: Icon = Inbox,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[14px] border border-dashed border-line bg-card px-6 py-14 text-center">
      <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-accent-soft text-accent">
        <Icon className="h-5 w-5" />
      </span>
      <h2 className="text-base font-bold text-ink">{title}</h2>
      {description && <p className="mt-1 max-w-sm text-sm text-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({
  title = "Something went wrong",
  message,
  action,
}: {
  title?: string;
  message?: string;
  action?: React.ReactNode;
}) {
  return (
    <div role="alert" className="flex flex-col items-center rounded-[14px] border border-line bg-card px-6 py-12 text-center">
      <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-error-bg text-error-fg">
        <AlertTriangle className="h-5 w-5" />
      </span>
      <h2 className="text-base font-bold">{title}</h2>
      {message && <p className="mt-1 max-w-md text-sm text-muted">{message}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function MetricCard({
  label,
  value,
  hint,
  trend,
}: {
  label: string;
  value: number | string;
  hint: string;
  trend?: { pct: number | null; label: string };
}) {
  return (
    <Card className="p-5">
      <p className="text-[13px] font-semibold text-muted">{label}</p>
      <p className="tabular mt-2 text-[34px] font-extrabold leading-none tracking-tight">{value}</p>
      <p className="mt-3 text-xs text-muted">
        {trend && trend.pct !== null && (
          <span className={cn("mr-1.5 font-bold", trend.pct >= 0 ? "text-success-fg" : "text-error-fg")}>
            {trend.pct >= 0 ? "+" : ""}
            {trend.pct}%
          </span>
        )}
        {trend && trend.pct !== null ? trend.label : hint}
      </p>
    </Card>
  );
}

export function TextLink({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) {
  return (
    <Link href={href} className={cn("font-semibold text-accent hover:text-accent-hover hover:underline", className)}>
      {children}
    </Link>
  );
}

export function Pagination({
  page,
  pageCount,
  hrefFor,
}: {
  page: number;
  pageCount: number;
  hrefFor: (p: number) => string;
}) {
  if (pageCount <= 1) return null;
  const btn = "inline-flex h-9 items-center rounded-[10px] border border-line bg-card px-3 text-sm font-semibold hover:bg-[#f3f1ec]";
  return (
    <nav aria-label="Pagination" className="mt-4 flex items-center justify-between">
      <p className="text-xs text-muted">
        Page {page} of {pageCount}
      </p>
      <div className="flex gap-2">
        {page > 1 ? (
          <Link href={hrefFor(page - 1)} className={btn}>
            Previous
          </Link>
        ) : (
          <span className={cn(btn, "pointer-events-none opacity-50")}>Previous</span>
        )}
        {page < pageCount ? (
          <Link href={hrefFor(page + 1)} className={btn}>
            Next
          </Link>
        ) : (
          <span className={cn(btn, "pointer-events-none opacity-50")}>Next</span>
        )}
      </div>
    </nav>
  );
}
