import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { normalizeUsername, usernameToEmail, JARVIS_EMAIL } from "./identity";

const registerSchema = z.object({
  mobile: z
    .string()
    .trim()
    .min(6, "Enter a valid mobile number")
    .max(20, "Enter a valid mobile number")
    .regex(/^[+0-9 -]+$/, "Enter a valid mobile number"),
  username: z
    .string()
    .trim()
    .min(3, "Username must be at least 3 characters")
    .max(24, "Username must be under 24 characters")
    .regex(/^[A-Za-z0-9_.]+$/, "Only letters, numbers, _ and . are allowed"),
  email: z.string().trim().toLowerCase().email("Enter a valid email address").max(255),
  displayName: z.string().trim().min(2, "Display name is required").max(40),
  password: z.string().min(6, "Password must be at least 6 characters").max(72),
});

export const registerUser = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => registerSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const username = normalizeUsername(data.username);
    if (!username) throw new Error("Enter a valid username");

    const { data: existing } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("username", username)
      .maybeSingle();
    if (existing) throw new Error("That username is already taken");

    // Real email address: used for sign-in, password reset and notifications.
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
    });
    if (error || !created.user) {
      const message = error?.message ?? "";
      if (/already|registered|duplicate/i.test(message)) {
        throw new Error("An account with this email already exists");
      }
      throw new Error("Could not create the account. Try again.");
    }

    const { error: profileError } = await supabaseAdmin.from("profiles").insert({
      id: created.user.id,
      username,
      display_name: data.displayName.trim(),
      mobile: data.mobile.trim(),
    });
    if (profileError) {
      await supabaseAdmin.auth.admin.deleteUser(created.user.id);
      throw new Error("Could not create the account. Try again.");
    }

    return { email: data.email };
  });

const jarvisSchema = z.object({
  username: z.string().min(1).max(120),
  password: z.string().min(1).max(200),
});

export const jarvisLogin = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => jarvisSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { getJarvisConfig, safeEqual } = await import("./jarvis.server");
    const config = getJarvisConfig();

    const ok =
      safeEqual(data.username.trim(), config.username) && safeEqual(data.password, config.password);
    if (!ok) throw new Error("Authentication failed");

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("is_system", true)
      .maybeSingle();

    let jarvisId = profile?.id ?? null;

    if (!jarvisId) {
      const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
        email: JARVIS_EMAIL,
        password: config.password,
        email_confirm: true,
      });
      if (error || !created.user) throw new Error("Authentication failed");
      jarvisId = created.user.id;
      await supabaseAdmin.from("profiles").insert({
        id: jarvisId,
        username: "jarvis",
        display_name: "JARVIS",
        mobile: "system",
        is_system: true,
      });
    } else {
      await supabaseAdmin.auth.admin.updateUserById(jarvisId, { password: config.password });
    }

    await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: jarvisId, role: "owner" }, { onConflict: "user_id,role" });

    return { email: JARVIS_EMAIL };
  });
