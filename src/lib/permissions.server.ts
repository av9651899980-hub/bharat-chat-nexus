import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type PermissionKey = string;

/** Every permission the user effectively holds (rank defaults + per-user overrides). */
export async function getEffectivePermissions(userId: string): Promise<PermissionKey[]> {
  const { data, error } = await supabaseAdmin.rpc("effective_permissions", { _user_id: userId });
  if (error) throw new Error("Permission lookup failed");
  return (data ?? []).map((r: { permission: string }) => r.permission);
}

export async function hasPermission(userId: string, permission: PermissionKey) {
  const { data, error } = await supabaseAdmin.rpc("has_permission", {
    _user_id: userId,
    _permission: permission,
  });
  if (error) throw new Error("Permission check failed");
  return data === true;
}

/** Throws unless the caller holds the permission (owner always passes). */
export async function assertPermission(userId: string, permission: PermissionKey) {
  if (!(await hasPermission(userId, permission))) {
    throw new Error("You do not have permission to do this");
  }
  return true;
}
