import { supabase } from "@/integrations/supabase/client";

export type ChatSummary = {
  id: string;
  isGroup: boolean;
  title: string;
  subtitle: string;
  otherUserId: string | null;
  avatarUrl: string | null;
  updatedAt: string;
};

export async function loadChats(userId: string, isGroup: boolean): Promise<ChatSummary[]> {
  const { data: memberships } = await supabase
    .from("chat_members")
    .select("chat_id, chats!inner(id, is_group, name, updated_at)")
    .eq("user_id", userId);

  const rows = (memberships ?? []).filter(
    (m) => (m.chats as { is_group: boolean } | null)?.is_group === isGroup,
  );
  const chatIds = rows.map((r) => r.chat_id);
  if (!chatIds.length) return [];

  const [{ data: members }, { data: messages }] = await Promise.all([
    supabase
      .from("chat_members")
      .select("chat_id, user_id, profiles:user_id(display_name, username, avatar_url)")
      .in("chat_id", chatIds),
    supabase
      .from("messages")
      .select("chat_id, content, kind, created_at, deleted_at")
      .in("chat_id", chatIds)
      .order("created_at", { ascending: false })
      .limit(300),
  ]);

  return rows
    .map((row) => {
      const chat = row.chats as unknown as { id: string; is_group: boolean; name: string | null; updated_at: string };
      const others = (members ?? []).filter((m) => m.chat_id === chat.id && m.user_id !== userId);
      const last = (messages ?? []).find((m) => m.chat_id === chat.id);
      const other = others[0]?.profiles as { display_name?: string; avatar_url?: string | null } | null | undefined;
      return {
        id: chat.id,
        isGroup: chat.is_group,
        title: isGroup ? (chat.name ?? "Group") : (other?.display_name ?? "Unknown"),
        subtitle: last
          ? last.deleted_at
            ? "Message deleted"
            : last.kind === "voice"
              ? "Voice message"
              : (last.content ?? "")
          : "No messages yet",
        otherUserId: others[0]?.user_id ?? null,
        avatarUrl: other?.avatar_url ?? null,
        updatedAt: last?.created_at ?? chat.updated_at,
      };
    })
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function findOrCreateDirectChat(userId: string, otherUserId: string) {
  const { data: mine } = await supabase
    .from("chat_members")
    .select("chat_id, chats!inner(is_group)")
    .eq("user_id", userId);
  const directIds = (mine ?? [])
    .filter((m) => !(m.chats as { is_group: boolean } | null)?.is_group)
    .map((m) => m.chat_id);

  if (directIds.length) {
    const { data: theirs } = await supabase
      .from("chat_members")
      .select("chat_id")
      .eq("user_id", otherUserId)
      .in("chat_id", directIds);
    if (theirs?.length) return theirs[0]!.chat_id;
  }

  const { data: chat, error } = await supabase
    .from("chats")
    .insert({ is_group: false, created_by: userId })
    .select("id")
    .single();
  if (error || !chat) {
    console.error("createChat failed", error);
    throw new Error("Could not create conversation. Please try again.");
  }

  // Insert the creator first (becomes admin), then the other member.
  // A single multi-row insert trips the members_insert policy for the 2nd row.
  const { error: selfError } = await supabase
    .from("chat_members")
    .insert({ chat_id: chat.id, user_id: userId, is_admin: true });
  if (selfError) {
    console.error("addSelfMember failed", selfError);
    await supabase.from("chats").delete().eq("id", chat.id);
    throw new Error("Could not create conversation. Please try again.");
  }

  const { error: otherError } = await supabase
    .from("chat_members")
    .insert({ chat_id: chat.id, user_id: otherUserId });
  if (otherError) {
    console.error("addOtherMember failed", otherError);
    await supabase.from("chats").delete().eq("id", chat.id);
    throw new Error("Could not add this person to the conversation.");
  }
  return chat.id;
}

export async function createGroup(userId: string, name: string, memberIds: string[]) {
  const { data, error } = await supabase.rpc("create_group_atomic", {
    _name: name, _members: [...new Set(memberIds)].filter(id => id !== userId),
  });
  if (error || !data) throw new Error(error?.message ?? "Could not create the group");
  return data;
}

export async function loadProfile(userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, display_name, bio, avatar_url, status, last_seen")
    .eq("id", userId)
    .maybeSingle();
  if (error) {
    console.error("loadProfile failed", error);
    throw new Error("Unable to open this user. Please try again.");
  }
  return data;
}

export async function searchProfiles(term: string, excludeId: string) {
  const { data } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url")
    .eq("is_system", false)
    .neq("id", excludeId)
    .or(`username.ilike.%${term}%,display_name.ilike.%${term}%`)
    .limit(20);
  return data ?? [];
}