"use server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSignupEnabled } from "./config";
import { loginSchema, signupSchema } from "@/lib/validation/schemas";

export interface LoginState {
  error?: string;
  fieldErrors?: { email?: string; password?: string };
}

export async function signIn(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) {
    const f = parsed.error.flatten().fieldErrors;
    return { fieldErrors: { email: f.email?.[0], password: f.password?.[0] } };
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    console.error("[signIn] Supabase error:", error.status, error.code, error.message);
    if (error.code === "email_not_confirmed" || error.message.toLowerCase().includes("not confirmed")) {
      return {
        error:
          "Your email is not confirmed yet. Click the link in the confirmation email, or ask an admin to confirm the account (Supabase → Authentication → Users).",
      };
    }
    if (error.status === 429 || error.message.toLowerCase().includes("rate")) {
      return { error: "Too many attempts. Please wait a few minutes and try again." };
    }
    if (error.code === "invalid_credentials" || error.message.toLowerCase().includes("invalid login")) {
      return { error: "Incorrect email or password. Please try again." };
    }
    return { error: process.env.NODE_ENV === "production" ? "Could not sign in. Please try again." : `Supabase: ${error.message}` };
  }
  redirect("/dashboard");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export interface SignupState {
  error?: string;
  message?: string;
  fieldErrors?: { full_name?: string; email?: string; password?: string; confirm?: string };
}

export async function signUp(_prev: SignupState, formData: FormData): Promise<SignupState> {
  if (!isSignupEnabled()) return { error: "Sign-ups are disabled for this workspace." };
  const parsed = signupSchema.safeParse({
    full_name: formData.get("full_name"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) {
    const f = parsed.error.flatten().fieldErrors;
    return {
      fieldErrors: { full_name: f.full_name?.[0], email: f.email?.[0], password: f.password?.[0], confirm: f.confirm?.[0] },
    };
  }
  const h = await headers();
  const origin = h.get("origin") ?? `https://${h.get("host")}`;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { data: { full_name: parsed.data.full_name }, emailRedirectTo: `${origin}/auth/callback` },
  });
  if (error) {
    return { error: error.message.toLowerCase().includes("rate") ? "Too many attempts. Please wait and try again." : `Could not create the account. Try a different email or a stronger password. ${error.message}` }
  }
  if (data.session) redirect("/dashboard");
  // Email confirmation is enabled in Supabase: the user must click the emailed link.
  return { message: "Account created. Check your email to confirm your address, then sign in." };
}
