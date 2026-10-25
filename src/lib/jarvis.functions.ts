import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const verifyGodKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ key: z.string().min(1).max(12) }).parse(input))
  .handler(async ({ data, context }) => {
    const { designatedOwner, grantGateway } = await import("./owner-gateway.server");
    const { safeEqual } = await import("./jarvis.server");
    if (!await designatedOwner(context.supabase, context.claims)) throw new Error("Verification failed");
    const { data: owner, error: ownerError } = await context.supabase.rpc("is_owner", { _user_id: context.userId });
    if (ownerError || !owner) throw new Error("Verification failed");
    const godKey = process.env["GOD_KEY"];
    const sessionId = context.claims.session_id;
    if (!godKey || typeof sessionId !== "string") throw new Error("Verification failed");
    if (!safeEqual(data.key.trim(), godKey)) throw new Error("Verification failed");
    await grantGateway(context.userId, sessionId);
    return { ok: true as const };
  });

export const jarvisOverview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertOwner } = await import("./jarvis.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await assertOwner(context.userId);

    const [users, chats, groups, messages, reports, apps, settings] = await Promise.all([
      supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }).eq("is_system", false),
      supabaseAdmin.from("chats").select("id", { count: "exact", head: true }).eq("is_group", false),
      supabaseAdmin.from("chats").select("id", { count: "exact", head: true }).eq("is_group", true),
      supabaseAdmin.from("messages").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("reports").select("id", { count: "exact", head: true }).eq("status", "open"),
      supabaseAdmin
        .from("staff_applications")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending"),
      supabaseAdmin.from("system_settings").select("*"),
    ]);

    return {
      users: users.count ?? 0,
      chats: chats.count ?? 0,
      groups: groups.count ?? 0,
      messages: messages.count ?? 0,
      openReports: reports.count ?? 0,
      pendingApplications: apps.count ?? 0,
      settings: settings.data ?? [],
      databaseOnline: !users.error,
    };
  });

export const jarvisUsers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertOwner } = await import("./jarvis.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await assertOwner(context.userId);

    const [{ data: profiles }, { data: roles }, { data: members }, { data: apps }] = await Promise.all([
      supabaseAdmin
        .from("profiles")
        .select("id, username, display_name, mobile, bio, status, created_at, last_seen")
        .eq("is_system", false)
        .order("created_at", { ascending: false }),
      supabaseAdmin.from("user_roles").select("user_id, role"),
      supabaseAdmin.from("chat_members").select("user_id, chat_id, chats(name, is_group)"),
      supabaseAdmin.from("staff_applications").select("user_id, status, reason, created_at"),
    ]);

    return Promise.all((profiles ?? []).map(async (p) => {
      const { data: auth } = await supabaseAdmin.auth.admin.getUserById(p.id);
      return ({
      ...p,
      email: auth.user?.email ?? null,
      providers: (auth.user?.identities ?? []).map((identity) => identity.provider),
      roles: (roles ?? []).filter((r) => r.user_id === p.id).map((r) => r.role),
      groups: (members ?? [])
        .filter((m) => m.user_id === p.id && (m.chats as { is_group?: boolean } | null)?.is_group)
        .map((m) => (m.chats as { name?: string } | null)?.name ?? "Group"),
      application: (apps ?? []).find((a) => a.user_id === p.id) ?? null,
    }); }));
  });

export const jarvisSetUserStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({ userId: z.string().uuid(), status: z.enum(["active", "suspended", "restricted"]) })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { assertPermission } = await import("./permissions.server");
    const { assertOutranksLogged, logActivity } = await import("./powers.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await assertPermission(
      context.userId,
      data.status === "suspended" ? "suspend_user" : "restrict_user",
    );
    await assertOutranksLogged(context.userId, data.userId, `jarvis.set_status.${data.status}`);
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ status: data.status })
      .eq("id", data.userId);
    if (error) throw new Error("Could not update the account status");
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
    });
    return { ok: true as const };
  });

export const jarvisChats = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertPermission } = await import("./permissions.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await assertPermission(context.userId, "view_chats");

    const { data: chats } = await supabaseAdmin
      .from("chats")
      .select("id, is_group, name, created_at")
      .eq("is_group", false)
      .order("updated_at", { ascending: false });
    const { data: members } = await supabaseAdmin
      .from("chat_members")
      .select("chat_id, profiles:user_id(display_name, username)");

    return (chats ?? []).map((c) => ({
      ...c,
      participants: (members ?? [])
        .filter((m) => m.chat_id === c.id)
        .map((m) => (m.profiles as { display_name?: string } | null)?.display_name ?? "Unknown"),
    }));
  });

export const jarvisChatMessages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ chatId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { assertPermission } = await import("./permissions.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await assertPermission(context.userId, "view_chats");
    const { data: messages } = await supabaseAdmin
      .from("messages")
      .select("id, content, kind, created_at, edited_at, deleted_at, profiles:sender_id(display_name)")
      .eq("chat_id", data.chatId)
      .order("created_at", { ascending: true })
      .limit(500);
    return messages ?? [];
  });

export const jarvisGroups = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertPermission } = await import("./permissions.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await assertPermission(context.userId, "view_chats");

    const { data: groups } = await supabaseAdmin
      .from("chats")
      .select("id, name, description, only_admins_send, created_at")
      .eq("is_group", true)
      .order("created_at", { ascending: false });
    const { data: members } = await supabaseAdmin
      .from("chat_members")
      .select("chat_id, user_id, is_admin, profiles:user_id(display_name, username)");

    return (groups ?? []).map((g) => ({
      ...g,
      members: (members ?? [])
        .filter((m) => m.chat_id === g.id)
        .map((m) => ({
          userId: m.user_id,
          isAdmin: m.is_admin,
          displayName: (m.profiles as { display_name?: string } | null)?.display_name ?? "Unknown",
          username: (m.profiles as { username?: string } | null)?.username ?? "",
        })),
    }));
  });

export const jarvisGroupAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        action: z.enum([
          "add_member",
          "remove_member",
          "promote",
          "demote",
          "update",
          "delete",
        ]),
        groupId: z.string().uuid(),
        userId: z.string().uuid().optional(),
        name: z.string().trim().max(60).optional(),
        description: z.string().trim().max(300).optional(),
        onlyAdminsSend: z.boolean().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { assertPermission } = await import("./permissions.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await assertPermission(
      context.userId,
      data.action === "delete"
        ? "delete_group"
        : data.action === "update"
          ? "manage_group_settings"
          : "manage_group_members",
    );

    const { data: group, error: groupError } = await supabaseAdmin.from("chats").select("is_group, created_by, name").eq("id", data.groupId).maybeSingle();
    if (groupError || !group?.is_group) throw new Error("Group not found.");
    const { assertOutranksLogged, logActivity } = await import("./powers.server");
    let operation;
    if (data.action === "delete") {
      operation = await supabaseAdmin.from("chats").delete().eq("id", data.groupId);
    } else if (data.action === "update") {
      operation = await supabaseAdmin.from("chats").update({
        ...(data.name ? { name: data.name } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.onlyAdminsSend !== undefined ? { only_admins_send: data.onlyAdminsSend } : {}),
      }).eq("id", data.groupId);
    } else {
      if (!data.userId) throw new Error("A member is required for this action");
      const { assertGroupOwnerProtected } = await import("./access-rules");
      assertGroupOwnerProtected(group.created_by, data.userId, data.action);
      await assertOutranksLogged(context.userId, data.userId, `jarvis.group.${data.action}`);
      if (data.action === "add_member") operation = await supabaseAdmin.from("chat_members").upsert({ chat_id: data.groupId, user_id: data.userId }, { onConflict: "chat_id,user_id" });
      else if (data.action === "remove_member") operation = await supabaseAdmin.from("chat_members").delete().eq("chat_id", data.groupId).eq("user_id", data.userId);
      else operation = await supabaseAdmin.from("chat_members").update({ is_admin: data.action === "promote" }).eq("chat_id", data.groupId).eq("user_id", data.userId);
    }
    if (operation.error) throw new Error(operation.error.message);
    await logActivity({ actorId: context.userId, action: `jarvis.group.${data.action}`, targetType: "group", targetId: data.groupId, targetLabel: group.name });
    return { ok: true as const };
  });

export const jarvisStaff = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertPermission } = await import("./permissions.server");
    const { filterVisibleStaff } = await import("./powers.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await assertPermission(context.userId, "view_staff_panel");

    const [{ data: applications }, { data: roles }] = await Promise.all([
      supabaseAdmin
        .from("staff_applications")
        .select("id, user_id, reason, status, review_note, created_at, profiles:user_id(display_name, username)")
        .order("created_at", { ascending: false }),
      supabaseAdmin
        .from("user_roles")
        .select("user_id, role, profiles:user_id(display_name, username, is_system)"),
    ]);

    const staffRows = (roles ?? [])
      .filter((r) => !((r.profiles as { is_system?: boolean } | null)?.is_system ?? false))
      .map((r) => ({ ...r, user_id: r.user_id as string, role: r.role as string }));

    return {
      applications: applications ?? [],
      staff: await filterVisibleStaff(context.userId, staffRows),
    };
  });

export const jarvisReviewApplication = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["approved", "rejected"]),
        note: z.string().max(300).optional(),
        role: z.enum(["manager", "admin", "helper", "viewer"]).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { assertPermission } = await import("./permissions.server");
    const { assignableRoles, assertOutranksLogged } = await import("./powers.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await assertPermission(context.userId, "review_staff_applications");

    if (data.status === "approved" && !data.role) {
      throw new Error("Select a staff role before approving");
    }
    if (data.status === "approved" && data.role) {
      const allowed = await assignableRoles(context.userId);
      if (!allowed.includes(data.role)) {
        throw new Error("You cannot assign a rank at or above your own authority.");
      }
    }

    {
      const { data: applicant } = await supabaseAdmin
        .from("staff_applications")
        .select("user_id")
        .eq("id", data.id)
        .maybeSingle();
      if (applicant?.user_id) {
        await assertOutranksLogged(context.userId, applicant.user_id, "jarvis.review_application");
      }
    }

    const { data: app, error: updateError } = await supabaseAdmin
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
    if (updateError) throw new Error(updateError.message);

    if (app?.user_id) {
      let granted: string[] = [];
      if (data.status === "approved" && data.role) {
        await supabaseAdmin.from("user_roles").delete().eq("user_id", app.user_id).neq("role", "owner");
        const { error: roleError } = await supabaseAdmin
          .from("user_roles")
          .upsert({ user_id: app.user_id, role: data.role }, { onConflict: "user_id,role" });
        if (roleError) throw new Error(roleError.message);
        // Clear stale per-user overrides so the new rank's defaults apply immediately.
        await supabaseAdmin.from("user_permission_overrides").delete().eq("user_id", app.user_id);
        const { getEffectivePermissions } = await import("./permissions.server");
        granted = await getEffectivePermissions(app.user_id);
      }
      await supabaseAdmin.from("notifications").insert({
        user_id: app.user_id,
        kind: "staff",
        title: `Staff application ${data.status}`,
        body:
          data.status === "approved"
            ? `Welcome to the team. Your staff role is now ${data.role}. You now hold ${granted.length} permission${granted.length === 1 ? "" : "s"}.`
            : `Your staff application was not approved.${data.note ? ` Reason: ${data.note}` : ""}`,
      });
    }
    return { ok: true as const };
  });

export const jarvisSetRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        userId: z.string().uuid(),
        role: z.enum(["manager", "admin", "helper", "viewer", "none"]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { assertPermission } = await import("./permissions.server");
    const { assertOutranksLogged, assignableRoles, logActivity } = await import("./powers.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await assertPermission(context.userId, "assign_roles");
    if (data.userId === context.userId) throw new Error("You cannot change your own authority");
    await assertOutranksLogged(context.userId, data.userId, "jarvis.set_role");
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
      await supabaseAdmin.from("user_roles").insert({ user_id: data.userId, role: data.role });
    }
    await supabaseAdmin.from("notifications").insert({
      user_id: data.userId,
      kind: "staff",
      title: "Staff role updated",
      body: data.role === "none" ? "Your staff role was removed." : `Your role is now ${data.role}.`,
    });
    await logActivity({
      actorId: context.userId,
      action: data.role === "none" ? "Removed staff role" : `Set staff role to ${data.role}`,
      targetType: "user",
      targetId: data.userId,
    });
    return { ok: true as const };
  });

export const jarvisReports = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertPermission } = await import("./permissions.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await assertPermission(context.userId, "view_reports");
    const { data } = await supabaseAdmin
      .from("reports")
      .select(
        "id, reason, status, action_note, created_at, target_chat_id, reporter:reporter_id(display_name), target:target_user_id(display_name)",
      )
      .order("created_at", { ascending: false });
    return data ?? [];
  });

export const jarvisUpdateReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["open", "reviewing", "resolved", "dismissed"]),
        note: z.string().max(300).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { assertPermission } = await import("./permissions.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await assertPermission(context.userId, "resolve_reports");
    const { error } = await supabaseAdmin
      .from("reports")
      .update({ status: data.status, action_note: data.note ?? null })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    const { logActivity } = await import("./powers.server");
    await logActivity({ actorId: context.userId, action: `jarvis.report.${data.status}`, targetType: "report", targetId: data.id, detail: data.note ?? null });
    return { ok: true as const };
  });

export const jarvisAnnouncements = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertPermission } = await import("./permissions.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await assertPermission(context.userId, "view_staff_panel");
    const { data } = await supabaseAdmin
      .from("announcements")
      .select("*")
      .order("created_at", { ascending: false });
    return data ?? [];
  });

export const jarvisAnnounce = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ title: z.string().trim().min(2).max(80), body: z.string().trim().min(2).max(1000) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { assertPermission } = await import("./permissions.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await assertPermission(context.userId, "send_announcement");

    await supabaseAdmin.from("announcements").insert({ title: data.title, body: data.body });
    const { data: users } = await supabaseAdmin.from("profiles").select("id").eq("is_system", false);
    if (users?.length) {
      await supabaseAdmin.from("notifications").insert(
        users.map((u) => ({
          user_id: u.id,
          kind: "announcement",
          title: `👑 JARVIS 👑 — ${data.title}`,
          body: data.body,
        })),
      );
    }
    return { ok: true as const };
  });

export const jarvisSetSetting = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ key: z.string().min(1).max(40), value: z.record(z.string(), z.any()) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { assertOwner } = await import("./jarvis.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await assertOwner(context.userId);
    await supabaseAdmin
      .from("system_settings")
      .upsert({ key: data.key, value: data.value, updated_at: new Date().toISOString() });
    return { ok: true as const };
  });