import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const uuid = z.string().uuid();

/** Current staff identity: live rank, live permissions, assignable roles. */
export const powersContext = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { getEffectivePermissions } = await import("./permissions.server");
    const { topRoleOf, assignableRoles } = await import("./powers.server");
    const [permissions, role, roles] = await Promise.all([
      getEffectivePermissions(context.userId),
      topRoleOf(context.userId),
      assignableRoles(context.userId),
    ]);
    return { permissions, role, assignableRoles: roles, isStaff: !!role };
  });

/* ------------------------------- users ------------------------------- */

export const powersUsers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ query: z.string().max(60).optional() }).parse(input))
  .handler(async ({ data, context }) => {
    const { authorize } = await import("./powers.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await authorize(context.userId, "view_staff_panel", "powers.view_users");

    let q = supabaseAdmin
      .from("profiles")
      .select("id, username, display_name, mobile, bio, status, created_at, last_seen")
      .eq("is_system", false)
      .order("created_at", { ascending: false })
      .limit(100);
    const term = data.query?.trim();
    if (term) q = q.or(`username.ilike.%${term}%,display_name.ilike.%${term}%`);

    const [{ data: profiles }, { data: roles }] = await Promise.all([
      q,
      supabaseAdmin.from("user_roles").select("user_id, role"),
    ]);
    return (profiles ?? []).map((p) => ({
      ...p,
      roles: (roles ?? []).filter((r) => r.user_id === p.id).map((r) => r.role as string),
    }));
  });

export const powersSetUserStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ userId: uuid, status: z.enum(["active", "suspended", "restricted"]) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { authorize, assertOutranks, logActivity } = await import("./powers.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const permission = data.status === "suspended" ? "suspend_user" : "restrict_user";
    await authorize(context.userId, permission, `powers.set_status.${data.status}`);
    await assertOutranks(context.userId, data.userId);

    const { data: target, error } = await supabaseAdmin
      .from("profiles")
      .update({ status: data.status })
      .eq("id", data.userId)
      .select("display_name, username")
      .maybeSingle();
    if (error) throw new Error(error.message);

    await supabaseAdmin.from("notifications").insert({
      user_id: data.userId,
      kind: "account",
      title: "Account status updated",
      body: `Your account status is now ${data.status}.`,
    });
    await logActivity({
      actorId: context.userId,
      action: data.status === "active" ? "Restored account" : `Set account ${data.status}`,
      targetType: "user",
      targetId: data.userId,
      targetLabel: target?.display_name ?? target?.username ?? null,
    });
    return { ok: true as const };
  });

export const powersWarnUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ userId: uuid, message: z.string().trim().min(3).max(300) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { authorize, assertOutranks, logActivity } = await import("./powers.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await authorize(context.userId, "warn_user", "powers.warn_user");
    await assertOutranks(context.userId, data.userId);
    await supabaseAdmin.from("notifications").insert({
      user_id: data.userId,
      kind: "account",
      title: "Staff warning",
      body: data.message,
    });
    await logActivity({
      actorId: context.userId,
      action: "Warned user",
      targetType: "user",
      targetId: data.userId,
      detail: data.message,
    });
    return { ok: true as const };
  });

/* --------------------------- moderation --------------------------- */

export const powersChats = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ group: z.boolean().optional() }).parse(input))
  .handler(async ({ data, context }) => {
    const { authorize } = await import("./powers.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await authorize(context.userId, "view_chats", "powers.view_chats");

    let q = supabaseAdmin
      .from("chats")
      .select("id, is_group, name, description, only_admins_send, created_at")
      .order("updated_at", { ascending: false })
      .limit(200);
    if (data.group !== undefined) q = q.eq("is_group", data.group);
    const [{ data: chats }, { data: members }] = await Promise.all([
      q,
      supabaseAdmin
        .from("chat_members")
        .select("chat_id, user_id, is_admin, profiles:user_id(display_name, username)"),
    ]);
    return (chats ?? []).map((c) => ({
      ...c,
      members: (members ?? [])
        .filter((m) => m.chat_id === c.id)
        .map((m) => ({
          userId: m.user_id,
          isAdmin: m.is_admin,
          displayName: (m.profiles as { display_name?: string } | null)?.display_name ?? "Unknown",
          username: (m.profiles as { username?: string } | null)?.username ?? "",
        })),
    }));
  });

export const powersMessages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ chatId: uuid }).parse(input))
  .handler(async ({ data, context }) => {
    const { authorize } = await import("./powers.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await authorize(context.userId, "view_chats", "powers.view_messages");
    const { data: messages } = await supabaseAdmin
      .from("messages")
      .select("id, content, kind, created_at, edited_at, deleted_at, sender_id, profiles:sender_id(display_name, username)")
      .eq("chat_id", data.chatId)
      .order("created_at", { ascending: true })
      .limit(300);
    return messages ?? [];
  });

export const powersDeleteMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ messageId: uuid }).parse(input))
  .handler(async ({ data, context }) => {
    const { authorize, logActivity } = await import("./powers.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await authorize(context.userId, "delete_message", "powers.delete_message");

    const { data: message } = await supabaseAdmin
      .from("messages")
      .select("sender_id")
      .eq("id", data.messageId)
      .maybeSingle();
    if (!message) throw new Error("Message not found.");
    if (message.sender_id && message.sender_id !== context.userId) {
      const { assertOutranksLogged } = await import("./powers.server");
      await assertOutranksLogged(context.userId, message.sender_id, "powers.delete_message");
    }

    const { error } = await supabaseAdmin
      .from("messages")
      .update({ deleted_at: new Date().toISOString(), content: null, audio_url: null, attachment_url: null, attachment_name: null, attachment_mime: null, attachment_size: null })
      .eq("id", data.messageId);
    if (error) throw new Error(error.message);
    await logActivity({
      actorId: context.userId,
      action: "Deleted message",
      targetType: "message",
      targetId: data.messageId,
    });
    return { ok: true as const };
  });

/* ------------------------------ groups ------------------------------ */

export const powersGroupAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        action: z.enum(["remove_member", "promote", "demote", "update", "delete"]),
        groupId: uuid,
        userId: uuid.optional(),
        name: z.string().trim().max(60).optional(),
        description: z.string().trim().max(300).optional(),
        onlyAdminsSend: z.boolean().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { authorize, logActivity } = await import("./powers.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const permission =
      data.action === "delete"
        ? "delete_group"
        : data.action === "update"
          ? "manage_group_settings"
          : "manage_group_members";
    await authorize(context.userId, permission, `powers.group.${data.action}`);

    const { data: group } = await supabaseAdmin
      .from("chats")
      .select("name, is_group, created_by")
      .eq("id", data.groupId)
      .maybeSingle();
    if (!group?.is_group) throw new Error("That conversation is not a group.");

    if (data.action === "delete") {
      const { error } = await supabaseAdmin.from("chats").delete().eq("id", data.groupId);
      if (error) throw new Error(error.message);
    } else if (data.action === "update") {
      const { error } = await supabaseAdmin
        .from("chats")
        .update({
          ...(data.name ? { name: data.name } : {}),
          ...(data.description !== undefined ? { description: data.description } : {}),
          ...(data.onlyAdminsSend !== undefined ? { only_admins_send: data.onlyAdminsSend } : {}),
        })
        .eq("id", data.groupId);
      if (error) throw new Error(error.message);
    } else {
      if (!data.userId) throw new Error("Select a member first.");
      const { assertGroupOwnerProtected } = await import("./access-rules");
      assertGroupOwnerProtected(group.created_by, data.userId, data.action);
      // Hierarchy protection: group powers can never reach an equal or
      // higher-ranked account (including the platform owner).
      const { assertOutranksLogged } = await import("./powers.server");
      await assertOutranksLogged(context.userId, data.userId, `powers.group.${data.action}`);
      if (data.action === "remove_member") {
        const { error } = await supabaseAdmin
          .from("chat_members")
          .delete()
          .eq("chat_id", data.groupId)
          .eq("user_id", data.userId);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabaseAdmin
          .from("chat_members")
          .update({ is_admin: data.action === "promote" })
          .eq("chat_id", data.groupId)
          .eq("user_id", data.userId);
        if (error) throw new Error(error.message);
      }
    }

    await logActivity({
      actorId: context.userId,
      action: `Group ${data.action.replace("_", " ")}`,
      targetType: "group",
      targetId: data.groupId,
      targetLabel: group?.name ?? null,
    });
    return { ok: true as const };
  });

/* ------------------------------ staff ------------------------------ */

export const powersStaff = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { authorize, filterVisibleStaff } = await import("./powers.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await authorize(context.userId, "view_staff_panel", "powers.view_staff");

    const [{ data: roles }, { data: applications }] = await Promise.all([
      supabaseAdmin
        .from("user_roles")
        .select("user_id, role, created_at, profiles:user_id(display_name, username, is_system)"),
      supabaseAdmin
        .from("staff_applications")
        .select("id, user_id, reason, status, review_note, created_at, profiles:user_id(display_name, username)")
        .order("created_at", { ascending: false })
        .limit(100),
    ]);

    const staffRows = (roles ?? [])
      .filter((r) => !((r.profiles as { is_system?: boolean } | null)?.is_system ?? false))
      .map((r) => ({ ...r, user_id: r.user_id as string, role: r.role as string }));
    const visible = await filterVisibleStaff(context.userId, staffRows);

    return { staff: visible, applications: applications ?? [] };
  });

export const powersReviewApplication = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: uuid,
        status: z.enum(["approved", "rejected"]),
        note: z.string().max(300).optional(),
        role: z.enum(["manager", "admin", "helper", "viewer"]).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { authorize, assignableRoles, logActivity } = await import("./powers.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await authorize(context.userId, "review_staff_applications", "powers.review_application");

    if (data.status === "approved") {
      if (!data.role) throw new Error("Select a staff rank before approving.");
      const allowed = await assignableRoles(context.userId);
      if (!allowed.includes(data.role)) {
        await logActivity({
          actorId: context.userId,
          action: "Approve staff application",
          result: "denied",
          detail: `Attempted to assign ${data.role}`,
        });
        throw new Error("You cannot assign a rank at or above your own authority.");
      }
    }

    const { data: pending } = await supabaseAdmin.from("staff_applications").select("user_id, status").eq("id", data.id).maybeSingle();
    if (!pending || pending.status !== "pending") throw new Error("This application is no longer pending.");
    const { assertOutranksLogged } = await import("./powers.server");
    await assertOutranksLogged(context.userId, pending.user_id, "powers.review_application");

    const { data: app, error } = await supabaseAdmin
      .from("staff_applications")
      .update({
        status: data.status,
        review_note: data.note ?? null,
        reviewed_at: new Date().toISOString(),
        reviewed_by: context.userId,
      })
      .eq("id", data.id)
      .select("user_id")
      .maybeSingle();
    if (error) throw new Error(error.message);

    if (app?.user_id) {
      if (data.status === "approved" && data.role) {
        await supabaseAdmin.from("user_roles").delete().eq("user_id", app.user_id).neq("role", "owner");
        const { error: roleError } = await supabaseAdmin
          .from("user_roles")
          .upsert({ user_id: app.user_id, role: data.role }, { onConflict: "user_id,role" });
        if (roleError) throw new Error(roleError.message);
        await supabaseAdmin.from("user_permission_overrides").delete().eq("user_id", app.user_id);
      }
      await supabaseAdmin.from("notifications").insert({
        user_id: app.user_id,
        kind: "staff",
        title: `Staff application ${data.status}`,
        body:
          data.status === "approved"
            ? `Welcome to the team. Your staff rank is now ${data.role}.`
            : `Your staff application was not approved.${data.note ? ` Reason: ${data.note}` : ""}`,
      });
    }

    await logActivity({
      actorId: context.userId,
      action: `Staff application ${data.status}`,
      targetType: "user",
      targetId: app?.user_id ?? null,
      detail: data.status === "approved" ? `Rank: ${data.role}` : (data.note ?? null),
    });
    return { ok: true as const };
  });

export const powersSetRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({ userId: uuid, role: z.enum(["manager", "admin", "helper", "viewer", "none"]) })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { authorize, assertOutranks, assignableRoles, logActivity } = await import("./powers.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await authorize(context.userId, "assign_roles", "powers.set_role");
    await assertOutranks(context.userId, data.userId);

    if (data.role !== "none") {
      const allowed = await assignableRoles(context.userId);
      if (!allowed.includes(data.role)) {
        await logActivity({
          actorId: context.userId,
          action: "Change staff role",
          targetType: "user",
          targetId: data.userId,
          result: "denied",
          detail: `Attempted to assign ${data.role}`,
        });
        throw new Error("You cannot assign a rank at or above your own authority.");
      }
    }

    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId).neq("role", "owner");
    await supabaseAdmin.from("user_permission_overrides").delete().eq("user_id", data.userId);
    if (data.role !== "none") {
      const { error } = await supabaseAdmin
        .from("user_roles")
        .insert({ user_id: data.userId, role: data.role });
      if (error) throw new Error(error.message);
    }
    await supabaseAdmin.from("notifications").insert({
      user_id: data.userId,
      kind: "staff",
      title: "Staff role updated",
      body: data.role === "none" ? "Your staff role was removed." : `Your rank is now ${data.role}.`,
    });
    await logActivity({
      actorId: context.userId,
      action: data.role === "none" ? "Removed staff role" : `Set staff role to ${data.role}`,
      targetType: "user",
      targetId: data.userId,
    });
    return { ok: true as const };
  });

/* ----------------------------- reports ----------------------------- */

export const powersReports = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { authorize } = await import("./powers.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await authorize(context.userId, "view_reports", "powers.view_reports");
    const { data } = await supabaseAdmin
      .from("reports")
      .select(
        "id, reason, status, action_note, created_at, target_chat_id, reporter:reporter_id(display_name, username), target:target_user_id(display_name, username)",
      )
      .order("created_at", { ascending: false })
      .limit(100);
    return data ?? [];
  });

export const powersUpdateReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: uuid,
        status: z.enum(["open", "reviewing", "resolved", "dismissed"]),
        note: z.string().max(300).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { authorize, logActivity } = await import("./powers.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await authorize(context.userId, "resolve_reports", "powers.update_report");
    const { error } = await supabaseAdmin
      .from("reports")
      .update({ status: data.status, action_note: data.note ?? null })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    await logActivity({
      actorId: context.userId,
      action: `Report ${data.status}`,
      targetType: "report",
      targetId: data.id,
      detail: data.note ?? null,
    });
    return { ok: true as const };
  });

/* -------------------------- announcements -------------------------- */

export const powersAnnouncements = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { authorize } = await import("./powers.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await authorize(context.userId, "send_announcement", "powers.view_announcements");
    const { data } = await supabaseAdmin
      .from("announcements")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    return data ?? [];
  });

export const powersAnnouncementAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        action: z.enum(["create", "update", "delete"]),
        id: uuid.optional(),
        title: z.string().trim().min(2).max(80).optional(),
        body: z.string().trim().min(2).max(1000).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { authorize, logActivity } = await import("./powers.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await authorize(context.userId, "send_announcement", `powers.announcement.${data.action}`);

    if (data.action === "create") {
      if (!data.title || !data.body) throw new Error("Title and message are required.");
      const { error } = await supabaseAdmin
        .from("announcements")
        .insert({ title: data.title, body: data.body });
      if (error) throw new Error(error.message);
      const { data: users } = await supabaseAdmin.from("profiles").select("id").eq("is_system", false);
      if (users?.length) {
        await supabaseAdmin.from("notifications").insert(
          users.map((u) => ({
            user_id: u.id,
            kind: "announcement",
            title: data.title!,
            body: data.body!,
          })),
        );
      }
    } else if (data.action === "update") {
      if (!data.id || !data.title || !data.body) throw new Error("Title and message are required.");
      const { error } = await supabaseAdmin
        .from("announcements")
        .update({ title: data.title, body: data.body })
        .eq("id", data.id);
      if (error) throw new Error(error.message);
    } else {
      if (!data.id) throw new Error("Select an announcement.");
      const { error } = await supabaseAdmin.from("announcements").delete().eq("id", data.id);
      if (error) throw new Error(error.message);
    }

    await logActivity({
      actorId: context.userId,
      action: `Announcement ${data.action}d`,
      targetType: "announcement",
      targetId: data.id ?? null,
      targetLabel: data.title ?? null,
    });
    return { ok: true as const };
  });

/* ---------------------- analytics + activity ---------------------- */

export const powersAnalytics = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { authorize } = await import("./powers.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await authorize(context.userId, "view_analytics", "powers.view_analytics");

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const head = { count: "exact" as const, head: true };

    const [users, groups, direct, messages, recent, openReports, pendingApps, staff] =
      await Promise.all([
        supabaseAdmin.from("profiles").select("id", head).eq("is_system", false),
        supabaseAdmin.from("chats").select("id", head).eq("is_group", true),
        supabaseAdmin.from("chats").select("id", head).eq("is_group", false),
        supabaseAdmin.from("messages").select("id", head),
        supabaseAdmin.from("messages").select("id", head).gte("created_at", since),
        supabaseAdmin.from("reports").select("id", head).eq("status", "open"),
        supabaseAdmin.from("staff_applications").select("id", head).eq("status", "pending"),
        supabaseAdmin.from("user_roles").select("role"),
      ]);

    const byRole: Record<string, number> = {};
    for (const r of staff.data ?? []) byRole[r.role as string] = (byRole[r.role as string] ?? 0) + 1;

    return {
      users: users.count ?? 0,
      groups: groups.count ?? 0,
      directChats: direct.count ?? 0,
      messages: messages.count ?? 0,
      messages24h: recent.count ?? 0,
      openReports: openReports.count ?? 0,
      pendingApplications: pendingApps.count ?? 0,
      staffByRole: byRole,
    };
  });

export const powersActivityLogs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { authorize } = await import("./powers.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await authorize(context.userId, "view_activity_logs", "powers.view_activity_logs");
    const { data: logs } = await supabaseAdmin
      .from("activity_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(150);
    const actorIds = [...new Set((logs ?? []).map((l) => l.actor_id).filter(Boolean))] as string[];
    const { data: actors } = actorIds.length
      ? await supabaseAdmin.from("profiles").select("id, display_name, username").in("id", actorIds)
      : { data: [] as { id: string; display_name: string; username: string }[] };
    return (logs ?? []).map((l) => ({
      ...l,
      actor: actors?.find((a) => a.id === l.actor_id) ?? null,
    }));
  });
