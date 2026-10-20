import type { Metadata } from "next";
import { getProfile, requireUser } from "@/lib/supabase/server";
import { isAiConfigured } from "@/lib/ai/provider";
import { Badge, Card, PageHeader } from "@/components/ui/primitives";
import { cn, formatDate } from "@/lib/utils/index";
import { DotPattern } from "@/components/ui/dot-pattern";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const { supabase, user } = await requireUser();
  const profile = await getProfile(supabase, user.id);
  const ai = isAiConfigured();
  const rows: [string, React.ReactNode][] = [
    ["Name", profile?.full_name || "—"],
    ["Email", user.email],
    ["Role", <span key="r" className="capitalize">{(profile?.role ?? "recruiter").replace("_", " ")}</span>],
    ["Account created", formatDate(user.created_at)],
  ];
  return (
    <>
      <DotPattern
        className={cn(
          "[mask-image:radial-gradient(300px_circle_at_center,white,transparent)]"
        )}
      />
      <div className="mx-auto max-w-2xl space-y-6">
        <PageHeader title="Settings" description="Your account and workspace configuration." />
        <div>
          <h2 className="mb-4 text-lg font-bold">Profile</h2>
          <dl className="divide-y divide-line text-sm">
            {rows.map(([k, v]) => (
              <div key={k} className="flex justify-between py-3">
                <dt className="text-muted">{k}</dt>
                <dd className="font-semibold">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div>
          <h2 className="mb-1 text-lg font-bold">Integrations</h2>
          <p className="mb-4 text-sm text-muted">Configured through server environment variables.</p>
          <div className="flex items-center justify-between text-sm">
            <span>AI recruiting assistant</span>
            <Badge className={ai ? "bg-success-bg text-success-fg" : "bg-warning-bg text-warning-fg"}>{ai ? "Configured" : "Not configured"}</Badge>
          </div>
        </div>
      </div>
    </>
  );
}
