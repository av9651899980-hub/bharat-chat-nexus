import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { googleProfileSchema } from "./google-account";
import { z } from "zod";

export const completeGoogleProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => googleProfileSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: auth, error: authError } = await context.supabase.auth.getUser();
    if (authError || !auth.user?.identities?.some((i) => i.provider === "google")) {
      throw new Error("Sign in with Google to create your profile.");
    }
    const { data: existing, error: readError } = await context.supabase.from("profiles")
      .select("id").eq("id", context.userId).maybeSingle();
    if (readError) throw new Error("Could not check your profile. Try again.");
    if (existing) return { ok: true };
    const { error } = await context.supabase.from("profiles").insert({
      id: context.userId, username: data.username, display_name: data.displayName, mobile: data.mobile,
    });
    if (error?.code === "23505") {
      const { data: saved } = await context.supabase.from("profiles").select("id")
        .eq("id", context.userId).maybeSingle();
      if (saved) return { ok: true };
      throw new Error("That username is already taken. Choose another.");
    }
    if (error) throw new Error("Could not save your profile. Your Google account is safe; please retry.");
    return { ok: true };
  });

// Resolve a handle only on the server, return no email, and retain legacy synthetic-email accounts.
export const loginWithHandle = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ username: z.string().trim().min(1).max(255),
    password: z.string().min(1).max(200) }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { resolveLoginEmail, normalizeUsername, isEmailAddress } = await import("./identity");
    let email = resolveLoginEmail(data.username);
    if (!isEmailAddress(data.username)) {
      const { data: profile } = await supabaseAdmin.from("profiles").select("id")
        .eq("username", normalizeUsername(data.username)).maybeSingle();
      if (profile) {
        const { data: account } = await supabaseAdmin.auth.admin.getUserById(profile.id);
        email = account.user?.email ?? email;
      }
    }
    const { createClient } = await import("@supabase/supabase-js");
    const url = process.env["SUPABASE_URL"];
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
    if (!url || !key) throw new Error("Sign-in is unavailable. Try again.");
    const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) headers.delete("Authorization");
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      } } });
    const { data: result, error } = await client.auth.signInWithPassword({ email, password: data.password });
    if (error || !result.session) throw new Error("Incorrect username, email or password.");
    return { access_token: result.session.access_token, refresh_token: result.session.refresh_token };
  });