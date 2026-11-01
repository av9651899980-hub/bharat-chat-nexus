import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Handles resolve to emails only on the server; the browser receives a masked hint, never the address.
async function resolveEmail(handle: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { resolveLoginEmail, normalizeUsername, isEmailAddress } = await import("./identity");
  if (isEmailAddress(handle)) return handle.trim().toLowerCase();
  const { data: profile } = await supabaseAdmin.from("profiles").select("id")
    .eq("username", normalizeUsername(handle)).maybeSingle();
  if (!profile) return resolveLoginEmail(handle);
  const { data } = await supabaseAdmin.auth.admin.getUserById(profile.id);
  return data.user?.email ?? resolveLoginEmail(handle);
}

function publicClient() {
  return import("@supabase/supabase-js").then(({ createClient }) => {
    const url = process.env["SUPABASE_URL"]!;
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
    return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      } } });
  });
}

function mask(email: string) {
  const [local = "", domain = ""] = email.split("@");
  return `${local.slice(0, 2)}${"•".repeat(Math.max(local.length - 2, 3))}@${domain}`;
}

export const requestPasswordCode = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ handle: z.string().trim().min(1).max(255), redirectTo: z.string().url() }).parse(i))
  .handler(async ({ data }) => {
    const email = await resolveEmail(data.handle);
    const client = await publicClient();
    await client.auth.resetPasswordForEmail(email, { redirectTo: data.redirectTo });
    // Same response whether or not the account exists, to avoid account enumeration.
    return { hint: mask(email) };
  });

export const verifyPasswordCode = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ handle: z.string().trim().min(1).max(255), code: z.string().regex(/^\d{6,8}$/) }).parse(i))
  .handler(async ({ data }) => {
    const email = await resolveEmail(data.handle);
    const client = await publicClient();
    const { data: res, error } = await client.auth.verifyOtp({ email, token: data.code, type: "recovery" });
    if (error || !res.session) throw new Error("That code is incorrect or expired.");
    return { access_token: res.session.access_token, refresh_token: res.session.refresh_token };
  });
