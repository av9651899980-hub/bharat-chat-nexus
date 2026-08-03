import { supabase } from "@/integrations/supabase/client";

export type ChatSummary = {
  id: string;
  isGroup: boolean;
  title: string;
  subtitle: string;
  otherUserId: string | null;
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
      .select("chat_id, user_id, profiles:user_id(display_name, username)")
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
      const other = others[0]?.profiles as { display_name?: string } | null | undefined;
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
  if (error || !chat) throw new Error("Could not start the conversation");

  const { error: memberError } = await supabase.from("chat_members").insert([
    { chat_id: chat.id, user_id: userId, is_admin: true },
    { chat_id: chat.id, user_id: otherUserId },
  ]);
  if (memberError) throw new Error("Could not start the conversation");
  return chat.id;
}

export async function createGroup(userId: string, name: string, memberIds: string[]) {
  const { data: chat, error } = await supabase
    .from("chats")
    .insert({ is_group: true, name, created_by: userId })
    .select("id")
    .single();
  if (error || !chat) throw new Error("Could not create the group");

  const { error: memberError } = await supabase.from("chat_members").insert([
    { chat_id: chat.id, user_id: userId, is_admin: true },
    ...memberIds.map((id) => ({ chat_id: chat.id, user_id: id })),
  ]);
  if (memberError) throw new Error("Could not add members to the group");
  return chat.id;
}

export async function searchProfiles(term: string, excludeId: string) {
  const { data } = await supabase
    .from("profiles")
    .select("id, username, display_name")
    .eq("is_system", false)
    .neq("id", excludeId)
    .or(`username.ilike.%${term}%,display_name.ilike.%${term}%`)
    .limit(20);
  return data ?? [];
}