import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Send, MoreVertical, Check, CheckCheck, X } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { RoleBadge } from "@/components/role-badge";
import { VoiceRecorder, VoicePlayer } from "@/components/voice-recorder";
import { useAccount } from "@/hooks/useAccount";
import { supabase } from "@/integrations/supabase/client";
import { topRole, type AppRole } from "@/lib/identity";
import { loadChats, searchProfiles } from "@/lib/chat-client";
import { ProfileAvatar } from "@/components/profile-avatar";

export const Route = createFileRoute("/_authenticated/c/$chatId")({
  head: () => ({
    meta: [
      { title: "Conversation — BharatChat" },
      { name: "description", content: "Send messages, replies, reactions and voice notes on BharatChat." },
      { property: "og:title", content: "Conversation — BharatChat" },
      { property: "og:description", content: "Your BharatChat conversation." },
    ],
  }),
  component: ConversationPage,
});

type MessageRow = {
  id: string;
  chat_id: string;
  sender_id: string;
  kind: string;
  content: string | null;
  audio_url: string | null;
  audio_duration: number | null;
  reply_to: string | null;
  edited_at: string | null;
  deleted_at: string | null;
  created_at: string;
};

function ConversationPage() {
  const { chatId } = Route.useParams();
  const { userId } = useAccount();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const [draft, setDraft] = useState("");
  const [replyTo, setReplyTo] = useState<MessageRow | null>(null);
  const [editing, setEditing] = useState<MessageRow | null>(null);
  const [active, setActive] = useState<MessageRow | null>(null);
  const [forwarding, setForwarding] = useState<MessageRow | null>(null);
  const [panel, setPanel] = useState(false);

  const { data: chat } = useQuery({
    queryKey: ["chat", chatId],
    queryFn: async () => {
      const { data } = await supabase.from("chats").select("*").eq("id", chatId).maybeSingle();
      return data;
    },
  });

  const { data: members } = useQuery({
    queryKey: ["chat-members", chatId],
    queryFn: async () => {
      const { data } = await supabase
        .from("chat_members")
        .select("user_id, is_admin, profiles:user_id(display_name, username, avatar_url, last_seen, status)")
        .eq("chat_id", chatId);
      const ids = (data ?? []).map((m) => m.user_id);
      const { data: roles } = ids.length
        ? await supabase.from("user_roles").select("user_id, role").in("user_id", ids)
        : { data: [] as { user_id: string; role: string }[] };
      return (data ?? []).map((m) => ({
        userId: m.user_id,
        isAdmin: m.is_admin,
        profile: m.profiles as unknown as {
          display_name: string;
          username: string;
           avatar_url: string | null;
          last_seen: string;
          status: string;
        } | null,
        role: topRole(
          (roles ?? []).filter((r) => r.user_id === m.user_id).map((r) => r.role as AppRole),
        ),
      }));
    },
  });

  const { data: messages } = useQuery({
    queryKey: ["messages", chatId],
    queryFn: async () => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("chat_id", chatId)
        .order("created_at", { ascending: true });
      return (data ?? []) as MessageRow[];
    },
  });

  const { data: reactions } = useQuery({
    queryKey: ["reactions", chatId, messages?.length],
    enabled: !!messages?.length,
    queryFn: async () => {
      const { data } = await supabase
        .from("message_reactions")
        .select("message_id, emoji, user_id")
        .in("message_id", (messages ?? []).map((m) => m.id));
      return data ?? [];
    },
  });

  const { data: reads } = useQuery({
    queryKey: ["reads", chatId, messages?.length],
    enabled: !!messages?.length,
    queryFn: async () => {
      const { data } = await supabase
        .from("message_reads")
        .select("message_id, user_id")
        .in("message_id", (messages ?? []).map((m) => m.id));
      return data ?? [];
    },
  });

  const { data: myChats } = useQuery({
    queryKey: ["forward-targets", userId],
    enabled: !!userId && !!forwarding,
    queryFn: async () => [...(await loadChats(userId!, false)), ...(await loadChats(userId!, true))],
  });

  useEffect(() => {
    const channel = supabase
      .channel(`chat-${chatId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages", filter: `chat_id=eq.${chatId}` },
        () => queryClient.invalidateQueries({ queryKey: ["messages", chatId] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatId, queryClient]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages?.length]);

  useEffect(() => {
    if (!userId || !messages?.length) return;
    const unread = messages.filter(
      (m) => m.sender_id !== userId && !(reads ?? []).some((r) => r.message_id === m.id && r.user_id === userId),
    );
    if (!unread.length) return;
    supabase
      .from("message_reads")
      .upsert(
        unread.map((m) => ({ message_id: m.id, user_id: userId })),
        { onConflict: "message_id,user_id" },
      )
      .then(() => queryClient.invalidateQueries({ queryKey: ["reads", chatId] }));
    supabase.from("profiles").update({ last_seen: new Date().toISOString() }).eq("id", userId).then(() => {});
  }, [messages, reads, userId, chatId, queryClient]);

  const me = members?.find((m) => m.userId === userId);
  const other = members?.find((m) => m.userId !== userId);
  const isGroup = !!chat?.is_group;
  const title = isGroup ? (chat?.name ?? "Group") : (other?.profile?.display_name ?? "Conversation");
  const canSend = !isGroup || !chat?.only_admins_send || !!me?.isAdmin;

  const presence = useMemo(() => {
    if (isGroup) return `${members?.length ?? 0} members`;
    if (!other?.profile?.last_seen) return "";
    const diff = Date.now() - new Date(other.profile.last_seen).getTime();
    return diff < 120000 ? "online" : `last seen ${new Date(other.profile.last_seen).toLocaleString()}`;
  }, [isGroup, members, other]);

  async function send() {
    const text = draft.trim();
    if (!text || !userId) return;
    setDraft("");

    if (editing) {
      await supabase.from("message_revisions").insert({ message_id: editing.id, content: editing.content });
      const { error } = await supabase
        .from("messages")
        .update({ content: text, edited_at: new Date().toISOString() })
        .eq("id", editing.id);
      if (error) toast.error("Could not edit the message");
      setEditing(null);
    } else {
      const { error } = await supabase.from("messages").insert({
        chat_id: chatId,
        sender_id: userId,
        content: text,
        kind: "text",
        reply_to: replyTo?.id ?? null,
      });
      if (error) toast.error("Message could not be sent");
      setReplyTo(null);
      await notifyOthers(text);
    }
    queryClient.invalidateQueries({ queryKey: ["messages", chatId] });
  }

  async function notifyOthers(text: string) {
    const others = (members ?? []).filter((m) => m.userId !== userId);
    if (!others.length) return;
    await supabase.from("notifications").insert(
      others.map((m) => ({
        user_id: m.userId,
        kind: isGroup ? "group_message" : "message",
        title: isGroup ? `New message in ${title}` : "New message",
        body: text.slice(0, 120),
        link: `/c/${chatId}`,
      })),
    );
  }

  async function react(message: MessageRow, emoji: string) {
    if (!userId) return;
    const existing = (reactions ?? []).find(
      (r) => r.message_id === message.id && r.user_id === userId && r.emoji === emoji,
    );
    if (existing) {
      await supabase
        .from("message_reactions")
        .delete()
        .eq("message_id", message.id)
        .eq("user_id", userId)
        .eq("emoji", emoji);
    } else {
      await supabase.from("message_reactions").insert({ message_id: message.id, user_id: userId, emoji });
    }
    queryClient.invalidateQueries({ queryKey: ["reactions", chatId] });
    setActive(null);
  }

  async function remove(message: MessageRow) {
    await supabase
      .from("messages")
      .update({ deleted_at: new Date().toISOString(), content: null })
      .eq("id", message.id);
    queryClient.invalidateQueries({ queryKey: ["messages", chatId] });
    setActive(null);
  }

  async function forwardTo(targetChatId: string) {
    if (!forwarding || !userId) return;
    await supabase.from("messages").insert({
      chat_id: targetChatId,
      sender_id: userId,
      content: forwarding.content,
      kind: forwarding.kind,
      audio_url: forwarding.audio_url,
      audio_duration: forwarding.audio_duration,
      forwarded_from: forwarding.id,
    });
    setForwarding(null);
    toast.success("Message forwarded");
  }

  return (
    <AppShell title={title} showNav={false}>
      <div className="-mt-2 mb-3 flex items-center justify-between">
        <button onClick={() => navigate({ to: "/chats" })} className="flex items-center gap-1 text-sm text-muted-foreground">
          <ArrowLeft className="size-4" /> Back
        </button>
        <div className="flex items-center gap-2 text-right">
          {!isGroup ? <ProfileAvatar src={other?.profile?.avatar_url} name={title} className="size-9" textClassName="text-xs" /> : null}
          <div>
            <p className="text-sm font-semibold">
              {title}
              {!isGroup ? <RoleBadge role={other?.role ?? null} /> : null}
            </p>
            <p className="text-[11px] text-muted-foreground">{presence}</p>
          </div>
        </div>
        <button onClick={() => setPanel((v) => !v)} aria-label="Conversation options">
          <MoreVertical className="size-5" />
        </button>
      </div>

      {panel ? (
        <ConversationPanel
          chatId={chatId}
          isGroup={isGroup}
          isAdmin={!!me?.isAdmin}
          onlyAdminsSend={!!chat?.only_admins_send}
          otherUserId={other?.userId ?? null}
          members={members ?? []}
          onClose={() => setPanel(false)}
        />
      ) : null}

      <div className="space-y-2">
        {(messages ?? []).map((m) => {
          const mine = m.sender_id === userId;
          const sender = members?.find((x) => x.userId === m.sender_id);
          const parent = m.reply_to ? messages?.find((x) => x.id === m.reply_to) : null;
          const messageReactions = (reactions ?? []).filter((r) => r.message_id === m.id);
          const readByOther = (reads ?? []).some((r) => r.message_id === m.id && r.user_id !== m.sender_id);
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <button
                onClick={() => setActive(m)}
                className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-left shadow-soft ${
                  mine
                    ? "bg-bubble-out text-bubble-out-foreground"
                    : "border border-border bg-bubble-in text-bubble-in-foreground"
                }`}
              >
                {isGroup && !mine ? (
                  <span className="mb-0.5 block text-[11px] font-semibold text-primary">
                    {sender?.profile?.display_name ?? "Member"}
                    <RoleBadge role={sender?.role ?? null} />
                  </span>
                ) : null}
                {parent ? (
                  <span className="mb-1 block truncate rounded-lg border-l-2 border-primary/60 bg-black/5 px-2 py-1 text-[11px] opacity-80">
                    {parent.deleted_at ? "Message deleted" : (parent.content ?? "Voice message")}
                  </span>
                ) : null}
                {m.deleted_at ? (
                  <span className="text-sm italic opacity-70">This message was deleted</span>
                ) : m.kind === "voice" && m.audio_url ? (
                  <VoicePlayer path={m.audio_url} duration={m.audio_duration} />
                ) : (
                  <span className="whitespace-pre-wrap break-words text-sm">{m.content}</span>
                )}
                <span className="mt-1 flex items-center justify-end gap-1 text-[10px] opacity-70">
                  {m.edited_at ? "edited · " : ""}
                  {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  {mine ? readByOther ? <CheckCheck className="size-3" /> : <Check className="size-3" /> : null}
                </span>
                {messageReactions.length ? (
                  <span className="mt-1 flex gap-1">
                    {messageReactions.map((r, i) => (
                      <span key={i} className="rounded-full bg-background/70 px-1.5 text-xs">
                        {r.emoji}
                      </span>
                    ))}
                  </span>
                ) : null}
              </button>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {active ? (
        <div className="fixed inset-0 z-30 flex items-end bg-black/40" onClick={() => setActive(null)}>
          <div className="w-full rounded-t-3xl bg-card p-4" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex gap-2">
              {["👍", "❤️", "😂", "😮", "🙏"].map((emoji) => (
                <button key={emoji} onClick={() => react(active, emoji)} className="rounded-full bg-muted px-3 py-1.5 text-lg">
                  {emoji}
                </button>
              ))}
            </div>
            <div className="grid gap-1">
              <button className="rounded-xl px-3 py-2 text-left text-sm" onClick={() => { setReplyTo(active); setActive(null); }}>
                Reply
              </button>
              <button className="rounded-xl px-3 py-2 text-left text-sm" onClick={() => { setForwarding(active); setActive(null); }}>
                Forward
              </button>
              {active.sender_id === userId && !active.deleted_at && active.kind === "text" ? (
                <button
                  className="rounded-xl px-3 py-2 text-left text-sm"
                  onClick={() => { setEditing(active); setDraft(active.content ?? ""); setActive(null); }}
                >
                  Edit
                </button>
              ) : null}
              {active.sender_id === userId && !active.deleted_at ? (
                <button className="rounded-xl px-3 py-2 text-left text-sm text-destructive" onClick={() => remove(active)}>
                  Delete
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {forwarding ? (
        <div className="fixed inset-0 z-30 flex items-end bg-black/40" onClick={() => setForwarding(null)}>
          <div className="max-h-[70vh] w-full overflow-y-auto rounded-t-3xl bg-card p-4" onClick={(e) => e.stopPropagation()}>
            <p className="mb-2 text-sm font-semibold">Forward to</p>
            {(myChats ?? []).map((c) => (
              <button key={c.id} onClick={() => forwardTo(c.id)} className="block w-full rounded-xl px-3 py-2 text-left text-sm">
                {c.title}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/95 backdrop-blur">
        <div className="mx-auto w-full max-w-xl px-4 py-3">
          {replyTo || editing ? (
            <div className="mb-2 flex items-center justify-between rounded-xl bg-muted px-3 py-2 text-xs">
              <span className="truncate">
                {editing ? "Editing message" : `Replying to: ${replyTo?.content ?? "message"}`}
              </span>
              <button onClick={() => { setReplyTo(null); setEditing(null); setDraft(""); }}>
                <X className="size-4" />
              </button>
            </div>
          ) : null}
          {canSend ? (
            <div className="flex items-center gap-2">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") send();
                }}
                placeholder="Message"
                className="flex-1 rounded-full border border-input bg-card px-4 py-3 text-sm outline-none focus:border-ring"
              />
              <VoiceRecorder
                chatId={chatId}
                onSent={() => queryClient.invalidateQueries({ queryKey: ["messages", chatId] })}
              />
              <button
                onClick={send}
                aria-label="Send message"
                className="brand-gradient flex size-11 shrink-0 items-center justify-center rounded-full text-primary-foreground"
              >
                <Send className="size-5" />
              </button>
            </div>
          ) : (
            <p className="py-2 text-center text-xs text-muted-foreground">
              Only group admins can send messages here.
            </p>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function ConversationPanel({
  chatId,
  isGroup,
  isAdmin,
  onlyAdminsSend,
  otherUserId,
  members,
  onClose,
}: {
  chatId: string;
  isGroup: boolean;
  isAdmin: boolean;
  onlyAdminsSend: boolean;
  otherUserId: string | null;
  members: { userId: string; isAdmin: boolean; profile: { display_name: string; username: string } | null }[];
  onClose: () => void;
}) {
  const { userId } = useAccount();
  const queryClient = useQueryClient();
  const [term, setTerm] = useState("");
  const [reason, setReason] = useState("");

  const { data: people } = useQuery({
    queryKey: ["group-add-search", term, userId],
    enabled: !!userId && isGroup && isAdmin && term.trim().length > 1,
    queryFn: () => searchProfiles(term.trim(), userId!),
  });

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ["chat-members", chatId] });
    await queryClient.invalidateQueries({ queryKey: ["chat", chatId] });
  }

  return (
    <div className="mb-4 space-y-3 rounded-2xl border border-border bg-card p-4 shadow-soft">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">{isGroup ? "Group info" : "Conversation"}</p>
        <button onClick={onClose} aria-label="Close">
          <X className="size-4" />
        </button>
      </div>

      {isGroup ? (
        <>
          <ul className="space-y-1">
            {members.map((m) => (
              <li key={m.userId} className="flex items-center justify-between rounded-xl bg-muted px-3 py-2 text-sm">
                <span>
                  {m.profile?.display_name}
                  {m.isAdmin ? <span className="ml-1 text-[10px] font-bold text-primary">ADMIN</span> : null}
                </span>
                {isAdmin && m.userId !== userId ? (
                  <span className="flex gap-2 text-[11px]">
                    <button
                      onClick={async () => {
                        await supabase
                          .from("chat_members")
                          .update({ is_admin: !m.isAdmin })
                          .eq("chat_id", chatId)
                          .eq("user_id", m.userId);
                        refresh();
                      }}
                      className="text-primary"
                    >
                      {m.isAdmin ? "Demote" : "Promote"}
                    </button>
                    <button
                      onClick={async () => {
                        await supabase.from("chat_members").delete().eq("chat_id", chatId).eq("user_id", m.userId);
                        refresh();
                      }}
                      className="text-destructive"
                    >
                      Remove
                    </button>
                  </span>
                ) : null}
              </li>
            ))}
          </ul>

          {isAdmin ? (
            <>
              <input
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                placeholder="Add member by username"
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring"
              />
              {(people ?? []).map((p) => (
                <button
                  key={p.id}
                  onClick={async () => {
                    await supabase.from("chat_members").insert({ chat_id: chatId, user_id: p.id });
                    setTerm("");
                    refresh();
                  }}
                  className="block w-full rounded-xl bg-muted px-3 py-2 text-left text-sm"
                >
                  Add {p.display_name} (@{p.username})
                </button>
              ))}
              <label className="flex items-center justify-between rounded-xl bg-muted px-3 py-2 text-sm">
                Only admins can send
                <input
                  type="checkbox"
                  checked={onlyAdminsSend}
                  onChange={async (e) => {
                    await supabase.from("chats").update({ only_admins_send: e.target.checked }).eq("id", chatId);
                    refresh();
                  }}
                />
              </label>
            </>
          ) : null}
        </>
      ) : null}

      <div className="space-y-2 border-t border-border pt-3">
        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason for report"
          className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring"
        />
        <div className="flex gap-2">
          <button
            onClick={async () => {
              if (!reason.trim()) {
                toast.error("Add a reason first");
                return;
              }
              await supabase.from("reports").insert({
                reporter_id: userId!,
                target_user_id: isGroup ? null : otherUserId,
                target_chat_id: chatId,
                reason: reason.trim().slice(0, 500),
              });
              setReason("");
              toast.success("Report submitted for moderation");
            }}
            className="flex-1 rounded-xl bg-secondary px-3 py-2 text-xs font-semibold text-secondary-foreground"
          >
            Report
          </button>
          {!isGroup && otherUserId ? (
            <button
              onClick={async () => {
                await supabase.from("blocks").insert({ blocker_id: userId!, blocked_id: otherUserId });
                toast.success("User blocked");
              }}
              className="flex-1 rounded-xl bg-destructive/10 px-3 py-2 text-xs font-semibold text-destructive"
            >
              Block
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}