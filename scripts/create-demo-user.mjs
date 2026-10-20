#!/usr/bin/env node
// Creates (or updates) the demo recruiter via the Supabase Admin API. Run locally only:
//   npm run demo:user -- you@example.com 'a-strong-password' 'Demo Recruiter'
import { createClient } from "@supabase/supabase-js";

const [email, password, name = "Demo Recruiter"] = process.argv.slice(2);
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local");
if (!email || !password) throw new Error("Usage: npm run demo:user -- <email> <password> [full name]");

const admin = createClient(url, key, { auth: { persistSession: false } });
const { data, error } = await admin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: { full_name: name },
});
if (error) {
  console.error("Could not create user:", error.message);
  process.exit(1);
}
console.log(`Created ${data.user.email} (${data.user.id}). Profile row is created by a database trigger.`);
