import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { hasPermission } from "./permissions.server";

export type ActorRole = "owner" | "manager" | "admin" | "helper" | "viewer" | null;

const RANK: Record<string, number> = { owner: 5, manager: 4, admin: 3, helper: 2, viewer: 1 };

/** Highest rank held by a user (0 = normal user). */
export async function rankOf(userId: string) {
  const { data } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", userId);
  return (data ?? []).reduce((max, r) => Math.max(max, RANK[r.role as string] ?? 0), 0);
}

export async function topRoleOf(userId: string): Promise<ActorRole> {
  const { data } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", userId);
  const sorted = (data ?? [])
    .map((r) => r.role as string)
    .sort((a, b) => (RANK[b] ?? 0) - (RANK[a] ?? 0));
  return (sorted[0] as ActorRole) ?? null;
}

export async function logActivity(input: {
  actorId: string;
  action: string;
  targetType?: string;
  targetId?: string | null;
  targetLabel?: string | null;
  result?: "success" | "denied" | "failed";
  detail?: string | null;
}) {
  await supabaseAdmin.from("activity_logs").insert({
    actor_id: input.actorId,
    actor_role: await topRoleOf(input.actorId),
    action: input.action,
    target_type: input.targetType ?? null,
    target_id: input.targetId ?? null,
    target_label: input.targetLabel ?? null,
    result: input.result ?? "success",
    detail: input.detail ?? null,
  });
}

/**
 * Authorization boundary for every Powers action: verifies the permission
 * against the live database state and records denied attempts.
 */
export async function authorize(userId: string, permission: string, action: string) {
  if (await hasPermission(userId, permission)) return true;
  await logActivity({
    actorId: userId,
    action,
    result: "denied",
    detail: `Missing permission: ${permission}`,
  });
  throw new Error("You don't have permission to perform this action.");
}

/** Staff may only act on accounts strictly below their own authority. */
export async function assertOutranks(actorId: string, targetId: string) {
  if (actorId === targetId) throw new Error("You cannot perform this action on your own account.");
  const [actor, target] = await Promise.all([rankOf(actorId), rankOf(targetId)]);
  if (target >= actor) {
    throw new Error("You cannot act on an account with equal or higher authority.");
  }
  return true;
}

/** Roles a staff member is allowed to assign (strictly below their own rank). */
export async function assignableRoles(actorId: string) {
  const rank = await rankOf(actorId);
  return (["manager", "admin", "helper", "viewer"] as const).filter((r) => RANK[r]! < rank);
}
