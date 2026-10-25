import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const searchOwnerGateway = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ term: z.string().max(255) }).parse(input))
  .handler(async ({ data, context }) => {
    const { designatedOwner } = await import("./owner-gateway.server");
    const { safeEqual } = await import("./jarvis.server");
    const code = process.env["JARVIS_SEARCH_CODE"];
    if (!code || !await designatedOwner(context.supabase, context.claims) || !safeEqual(data.term, code)) return { open: false };
    // Trusted provisioning only for the verified configured Google identity; no other roles are changed.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("user_roles").upsert({ user_id: context.userId, role: "owner" }, { onConflict: "user_id,role" });
    if (error) return { open: false };
    return { open: true };
  });