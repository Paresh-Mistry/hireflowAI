import type { Metadata } from "next";
import Link from "next/link";
import { BriefcaseBusiness, MapPin, Users } from "lucide-react";
import { requireUser } from "@/lib/supabase/server";
import { listJobs } from "@/features/jobs/queries";
import { FilterBar } from "@/components/ui/filter-bar";
import { Badge, EmptyState, PageHeader, Pagination } from "@/components/ui/primitives";
import { LinkButton } from "@/components/ui/button";
import { firstParam, formatDate } from "@/lib/utils/index";
import { JOB_STATUS_STYLE } from "@/config/constants";

export const metadata: Metadata = { title: "Jobs" };

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const q = firstParam(sp.q);
  const status = firstParam(sp.status);
  const { supabase } = await requireUser();
  const { rows, total, page, pageCount } = await listJobs(supabase, { q, status, page: Number(firstParam(sp.page)) || 1 });
  const filtered = Boolean(q || status);

  const hrefFor = (p: number) => {
    const next = new URLSearchParams();
    if (q) next.set("q", q);
    if (status) next.set("status", status);
    next.set("page", String(p));
    return `/jobs?${next.toString()}`;
  };

  return (
    <>
      <PageHeader
        title="Jobs"
        description={`${total} job${total === 1 ? "" : "s"}`}
        actions={<LinkButton href="/jobs/new">Create Job</LinkButton>}
      />
      <FilterBar
        fields={[
          { type: "search", name: "q", label: "Search", placeholder: "Title, department or location…" },
          {
            type: "select",
            name: "status",
            label: "Status",
            allLabel: "All statuses",
            options: [
              { value: "open", label: "Open" },
              { value: "draft", label: "Draft" },
              { value: "closed", label: "Closed" },
            ],
          },
        ]}
      />
      {rows.length === 0 ? (
        <EmptyState
          icon={BriefcaseBusiness}
          title={filtered ? "No jobs match" : "No jobs yet"}
          description={filtered ? "Try a different search or clear the filters." : "Create your first job opening to start receiving applications."}
          action={<LinkButton href={filtered ? "/jobs" : "/jobs/new"}>{filtered ? "Clear filters" : "Create Job"}</LinkButton>}
        />
      ) : (
        <>
          <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {rows.map((j) => (
              <li key={j.id}>
                <Link
                  href={`/jobs/${j.id}`}
                  className="block h-full rounded-[14px] border border-line bg-card p-5 transition-colors hover:border-accent/60"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="text-base font-bold leading-snug">{j.title}</h2>
                    <Badge className={`${JOB_STATUS_STYLE[j.status]} capitalize`}>{j.status}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted">{j.department ?? "No department"}</p>
                  <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
                    <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{j.location ?? "Unspecified"}</span>
                    <span className="capitalize">{j.employment_type.replace("-", " ")}</span>
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-line pt-3 text-xs text-muted">
                    <span className="flex items-center gap-1 font-semibold text-ink">
                      <Users className="h-3.5 w-3.5" />
                      {j.application_count} application{j.application_count === 1 ? "" : "s"}
                    </span>
                    <span>Created {formatDate(j.created_at)}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
          <Pagination page={page} pageCount={pageCount} hrefFor={hrefFor} />
        </>
      )}
    </>
  );
}
