import { AppShell } from "@/components/layout/app-shell";
import { getProfile, requireUser } from "@/lib/supabase/server";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { supabase, user } = await requireUser();
  const profile = await getProfile(supabase, user.id);
  return (
    <AppShell name={profile?.full_name || user.email?.split("@")[0] || "Recruiter"} role={profile?.role ?? "recruiter"}>
      {children}
    </AppShell>
  );
}
