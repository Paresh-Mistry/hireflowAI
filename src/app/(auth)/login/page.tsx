import type { Metadata } from "next";
import { LoginForm } from "./login-form";
import Link from "next/link";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { isSignupEnabled } from "@/features/auth/config";

export const metadata: Metadata = { title: "Log in" };

export default function LoginPage() {
  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <section className="flex flex-col justify-center px-6 py-12 sm:px-16">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-10 flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-accent font-extrabold text-white">H</span>
            <span className="text-xl font-extrabold tracking-tight">HireFlow AI</span>
          </div>
          <h1 className="text-[30px] font-extrabold leading-tight tracking-tight">Welcome back</h1>
          <p className="mt-2 text-sm text-muted">Sign in to manage candidates, jobs and your hiring pipeline.</p>
          {!isSupabaseConfigured() && (
            <p role="alert" className="mt-5 rounded-[10px] bg-warning-bg px-3 py-2 text-sm text-warning-fg">
              Supabase is not configured. Copy <code>.env.example</code> to <code>.env.local</code> and add your project keys.
            </p>
          )}
          <LoginForm />
          {isSignupEnabled() && (
            <p className="mt-6 text-center text-sm text-muted">
              New here?{" "}
              <Link href="/signup" className="font-semibold text-accent hover:text-accent-hover">
                Create an account
              </Link>
            </p>
          )}
        </div>
      </section>
      <aside className="hidden flex-col justify-between bg-sidebar p-14 text-white lg:flex">
        <p className="text-sm font-semibold uppercase tracking-widest text-sidebar-ink">A clearer way to hire.</p>
        <div className="space-y-6">
          <p className="max-w-md text-[28px] font-extrabold leading-snug tracking-tight">
            See your whole pipeline at a glance, and review every candidate with evidence, not guesswork.
          </p>
          <ul className="space-y-2 text-sm text-sidebar-ink">
            <li>• Drag-and-drop hiring pipeline</li>
            <li>• Searchable candidate profiles with notes</li>
            <li>• AI resume analysis with cited evidence</li>
          </ul>
        </div>
        <p className="text-xs text-sidebar-ink">Internship assignment demo · fictional data only</p>
      </aside>
    </main>
  );
}
