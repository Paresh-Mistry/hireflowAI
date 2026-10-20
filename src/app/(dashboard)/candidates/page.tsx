import type { Metadata } from "next";
import Link from "next/link";
import { Users } from "lucide-react";
import { requireUser } from "@/lib/supabase/server";
import { listCandidates } from "@/features/candidates/queries";
import { listJobOptions } from "@/features/jobs/queries";
import { FilterBar } from "@/components/ui/filter-bar";
import { Avatar, Card, EmptyState, PageHeader, Pagination, SkillBadge, StageBadge } from "@/components/ui/primitives";
import { LinkButton } from "@/components/ui/button";
import { STAGES, STAGE_META } from "@/config/constants";
import { firstParam, formatDate } from "@/lib/utils/index";

export const metadata: Metadata = { title: "Candidates" };

export default async function CandidatesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const filters = {
    q: firstParam(sp.q),
    stage: firstParam(sp.stage),
    job: firstParam(sp.job),
    location: firstParam(sp.location),
    skill: firstParam(sp.skill),
    from: firstParam(sp.from),
    to: firstParam(sp.to),
    sort: firstParam(sp.sort),
    page: Number(firstParam(sp.page)) || 1,
  };
  const { supabase } = await requireUser();
  const [{ rows, total, page, pageCount }, jobs] = await Promise.all([listCandidates(supabase, filters), listJobOptions(supabase)]);
  const filtered = Object.entries(filters).some(([k, v]) => k !== "page" && k !== "sort" && v);

  const hrefFor = (p: number) => {
    const next = new URLSearchParams();
    Object.entries(sp).forEach(([k, v]) => {
      const val = firstParam(v);
      if (val && k !== "page") next.set(k, val);
    });
    next.set("page", String(p));
    return `/candidates?${next.toString()}`;
  };

  return (
    <>
      <PageHeader
        title="Candidates"
        description={`${total} candidate${total === 1 ? "" : "s"}${filtered ? " match your filters" : " in your workspace"}`}
        actions={<LinkButton href="/candidates/new">Add Candidate</LinkButton>}
      />
      <FilterBar
        fields={[
          { type: "search", name: "q", label: "Search", placeholder: "Name, email, title, skill or job…" },
          { type: "select", name: "stage", label: "Stage", allLabel: "All stages", options: STAGES.map((s) => ({ value: s, label: STAGE_META[s].label })) },
          { type: "select", name: "job", label: "Job", allLabel: "All jobs", options: jobs.map((j) => ({ value: j.id, label: j.title })) },
          { type: "text", name: "location", label: "Location", placeholder: "City or country" },
          { type: "text", name: "skill", label: "Skill", placeholder: "e.g. React" },
          { type: "date", name: "from", label: "Applied from" },
          { type: "date", name: "to", label: "Applied to" },
          {
            type: "select",
            name: "sort",
            label: "Sort by",
            allLabel: "Newest first",
            options: [
              { value: "oldest", label: "Oldest first" },
              { value: "name", label: "Name A–Z" },
              { value: "experience", label: "Most experienced" },
            ],
          },
        ]}
      />

      {rows.length === 0 ? (
        filtered ? (
          <EmptyState icon={Users} title="No candidates match" description="Try removing a filter or searching for something broader." action={<LinkButton href="/candidates" variant="secondary">Clear filters</LinkButton>} />
        ) : (
          <EmptyState icon={Users} title="No candidates yet" description="Add your first candidate to start building your talent pipeline." action={<LinkButton href="/candidates/new">Add Candidate</LinkButton>} />
        )
      ) : (
        <>
          <Card className="hidden overflow-hidden md:block">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Candidates</caption>
              <thead className="border-b border-line bg-[#faf9f6] text-xs font-semibold uppercase tracking-wide text-muted">
                <tr>
                  <th scope="col" className="px-4 py-3">Candidate</th>
                  <th scope="col" className="px-4 py-3">Current title</th>
                  <th scope="col" className="px-4 py-3">Skills</th>
                  <th scope="col" className="px-4 py-3">Applied job</th>
                  <th scope="col" className="px-4 py-3">Stage</th>
                  <th scope="col" className="px-4 py-3">Applied</th>
                  <th scope="col" className="px-4 py-3"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((c) => {
                  const latest = c.applications[0];
                  const extra = c.applications.length - 1;
                  return (
                    <tr key={c.id} className="hover:bg-[#faf9f6]">
                      <td className="px-4 py-3">
                        <Link href={`/candidates/${c.id}`} className="flex items-center gap-3">
                          <Avatar name={c.full_name} />
                          <span>
                            <span className="block font-semibold">{c.full_name}</span>
                            <span className="block text-xs text-muted">{c.email}</span>
                          </span>
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-muted">{c.current_title ?? "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex max-w-56 flex-wrap gap-1">
                          {c.skills.slice(0, 3).map((s) => (
                            <SkillBadge key={s}>{s}</SkillBadge>
                          ))}
                          {c.skills.length > 3 && <span className="text-xs text-muted">+{c.skills.length - 3}</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {latest ? (
                          <>
                            <span className="block max-w-48 truncate">{latest.job_title}</span>
                            {extra > 0 && <span className="text-xs text-muted">+{extra} more application{extra > 1 ? "s" : ""}</span>}
                          </>
                        ) : (
                          <span className="text-muted">Not applied</span>
                        )}
                      </td>
                      <td className="px-4 py-3">{latest ? <StageBadge stage={latest.stage} /> : "—"}</td>
                      <td className="px-4 py-3 text-muted">{latest ? formatDate(latest.applied_at) : "—"}</td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/candidates/${c.id}`} className="font-semibold text-accent hover:text-accent-hover">
                          View
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>

          {/* Mobile: card list instead of a squeezed table */}
          <ul className="space-y-3 md:hidden">
            {rows.map((c) => {
              const latest = c.applications[0];
              return (
                <li key={c.id}>
                  <Link href={`/candidates/${c.id}`} className="block rounded-[14px] border border-line bg-card p-4">
                    <div className="flex items-center gap-3">
                      <Avatar name={c.full_name} />
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{c.full_name}</p>
                        <p className="truncate text-xs text-muted">{c.current_title ?? c.email}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {latest && <StageBadge stage={latest.stage} />}
                      {latest && <span className="truncate text-xs text-muted">{latest.job_title}</span>}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
          <Pagination page={page} pageCount={pageCount} hrefFor={hrefFor} />
        </>
      )}
    </>
  );
}
