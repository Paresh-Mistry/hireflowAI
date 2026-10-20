import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Development convenience: GET /dev/login signs in with DEV_LOGIN_EMAIL / DEV_LOGIN_PASSWORD
 * using REAL Supabase auth (RLS still applies). Returns 404 anywhere except `next dev`.
 */
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV !== "development") return new NextResponse("Not found", { status: 404 });
  const email = process.env.DEV_LOGIN_EMAIL;
  const password = process.env.DEV_LOGIN_PASSWORD;
  if (!email || !password) {
    return new NextResponse("Set DEV_LOGIN_EMAIL and DEV_LOGIN_PASSWORD in .env.local", { status: 500 });
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return new NextResponse(`Dev login failed: ${error.message}`, { status: 401 });
  const next = request.nextUrl.searchParams.get("next") ?? "/dashboard";
  const safe = next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
  return NextResponse.redirect(new URL(safe, request.url));
}
