import type { Metadata } from "next";
import Link from "next/link";
import { SignupForm } from "./signup-form";
import { isSignupEnabled } from "@/features/auth/config";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const metadata: Metadata = { title: "Create account" };

export default function SignupPage() {
  const enabled = isSignupEnabled();
  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <section className="flex flex-col justify-center px-6 py-12 sm:px-16">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-10 flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-accent font-extrabold text-white">H</span>
            <span className="text-xl font-extrabold tracking-tight">HireFlow AI</span>
          </div>
          <h1 className="text-[30px] font-extrabold leading-tight tracking-tight">Create your account</h1>
          <p className="mt-2 text-sm text-muted">Join the workspace to manage candidates, jobs and your hiring pipeline.</p>
          {!isSupabaseConfigured() && (
            <p role="alert" className="mt-5 rounded-[10px] bg-warning-bg px-3 py-2 text-sm text-warning-fg">
              Supabase is not configured. Copy <code>.env.example</code> to <code>.env.local</code> and add your project keys.
            </p>
          )}
          {enabled ? (
            <SignupForm />
          ) : (
            <p role="alert" className="mt-8 rounded-[10px] bg-[#f3f1ec] px-3 py-3 text-sm">
              Sign-ups are disabled for this workspace. Ask an administrator for an account.
            </p>
          )}
          <p className="mt-6 text-center text-sm text-muted">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-accent hover:text-accent-hover">
              Sign in
            </Link>
          </p>
        </div>
      </section>
      <aside className="hidden flex-col justify-between bg-sidebar p-14 text-white lg:flex">
        <p className="text-sm font-semibold uppercase tracking-widest text-sidebar-ink">A clearer way to hire.</p>
        <p className="max-w-md text-[28px] font-extrabold leading-snug tracking-tight">
          Every new member shares the same candidates, jobs and pipeline.
        </p>
        <p className="text-xs text-sidebar-ink">Internship assignment demo · fictional data only</p>
      </aside>
    </main>
  );
}
