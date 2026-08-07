import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

/** Permissions of the signed-in user, derived from their rank + overrides. */
export const myPermissions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { getEffectivePermissions } = await import("./permissions.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [permissions, { data: roles }] = await Promise.all([
      getEffectivePermissions(context.userId),
      supabaseAdmin.from("user_roles").select("role").eq("user_id", context.userId),
    ]);
    return { permissions, roles: (roles ?? []).map((r) => r.role) };
  });

/** Full matrix: catalogue, rank defaults, staff members and their overrides. */
export const jarvisPermissionMatrix = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertPermission } = await import("./permissions.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await assertPermission(context.userId, "manage_permissions");

    const [{ data: permissions }, { data: rolePermissions }, { data: roles }, { data: overrides }] =
      await Promise.all([
        supabaseAdmin.from("permissions").select("key, label, category, sort_order").order("sort_order"),
        supabaseAdmin.from("role_permissions").select("role, permission"),
        supabaseAdmin
          .from("user_roles")
          .select("user_id, role, profiles:user_id(display_name, username, is_system)"),
        supabaseAdmin.from("user_permission_overrides").select("user_id, permission, granted"),
      ]);

    return {
      permissions: permissions ?? [],
      rolePermissions: rolePermissions ?? [],
      staff: (roles ?? []).filter(
        (r) => !((r.profiles as { is_system?: boolean } | null)?.is_system ?? false),
      ),
      overrides: overrides ?? [],
    };
  });

/** Turn a permission on/off for an entire rank (owner rank is immutable). */
export const jarvisSetRolePermission = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        role: z.enum(["manager", "admin", "helper", "viewer"]),
        permission: z.string().min(1).max(60),
        enabled: z.boolean(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { assertPermission } = await import("./permissions.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await assertPermission(context.userId, "manage_permissions");

    if (data.enabled) {
      const { error } = await supabaseAdmin
        .from("role_permissions")
        .upsert({ role: data.role, permission: data.permission }, { onConflict: "role,permission" });
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin
        .from("role_permissions")
        .delete()
        .eq("role", data.role)
        .eq("permission", data.permission);
      if (error) throw new Error(error.message);
    }
    return { ok: true as const };
  });

/** Grant/deny a single permission for one staff member, or clear the override. */
export const jarvisSetUserPermission = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        userId: z.string().uuid(),
        permission: z.string().min(1).max(60),
        mode: z.enum(["grant", "deny", "inherit"]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { assertPermission } = await import("./permissions.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await assertPermission(context.userId, "manage_permissions");

    if (data.mode === "inherit") {
      const { error } = await supabaseAdmin
        .from("user_permission_overrides")
        .delete()
        .eq("user_id", data.userId)
        .eq("permission", data.permission);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin.from("user_permission_overrides").upsert(
        { user_id: data.userId, permission: data.permission, granted: data.mode === "grant" },
        { onConflict: "user_id,permission" },
      );
      if (error) throw new Error(error.message);
    }
    return { ok: true as const };
  });

/** Effective permissions for any staff member (owner view). */
export const jarvisUserPermissions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ userId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { assertPermission, getEffectivePermissions } = await import("./permissions.server");
    await assertPermission(context.userId, "manage_permissions");
    return { permissions: await getEffectivePermissions(data.userId) };
  });
