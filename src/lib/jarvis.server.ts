import { supabaseAdmin } from "@/integrations/supabase/client.server";

/** Throws unless the caller holds the owner role (the JARVIS authority). */
export async function assertOwner(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "owner")
    .maybeSingle();
  if (error) throw new Error("Authorization check failed");
  if (!data) throw new Error("Forbidden");
  return true;
}

export function getJarvisConfig() {
  const username = process.env["JARVIS_USERNAME"];
  const password = process.env["JARVIS_PASSWORD"];
  const godKey = process.env["GOD_KEY"];
  if (!username || !password || !godKey) {
    throw new Error("JARVIS configuration is unavailable");
  }
  return { username, password, godKey };
}

/** Constant-time-ish comparison to avoid trivial timing leaks. */
export function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}