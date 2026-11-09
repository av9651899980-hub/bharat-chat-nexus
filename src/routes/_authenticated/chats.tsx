import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { searchOwnerGateway } from "@/lib/owner-gateway.functions";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Megaphone, Users, MoreHorizontal, MessageCircle } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { useAccount } from "@/hooks/useAccount";
import { hideChat, leaveGroup, loadChats, type ChatSummary } from "@/lib/chat-client";
import { filterConversations, type ConversationTypeFilter } from "@/lib/conversation-filters";
import { supabase } from "@/integrations/supabase/client";
import { ProfileAvatar } from "@/components/profile-avatar";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/chats")({
  head: () => ({
    meta: [
      { title: "Chats — BharatChat" },
      {
        name: "description",
        content: "Your recent BharatChat conversations, groups and announcements.",
      },
      { property: "og:title", content: "Chats — BharatChat" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:description", content: "Your recent BharatChat conversations." },
    ],
  }),
  component: ChatsPage,
});

function ChatsPage() {
  const { userId } = useAccount();
  const [term, setTerm] = useState("");
  const [filter, setFilter] = useState<ConversationTypeFilter>("all");
  const [activeChat, setActiveChat] = useState<ChatSummary | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const queryClient = useQueryClient();
  const gateway = useServerFn(searchOwnerGateway);
  const navigate = useNavigate();
  useEffect(() => {
    if (!term || term.length > 255) return;
    let active = true;
    const timer = setTimeout(() => {
      void gateway({ data: { term } }).then((result) => {
        if (active && result.open) void navigate({ to: "/omnivers" });
      }).catch(() => {}); // Ordinary search behavior never reveals gateway errors.
    }, 600);
    return () => { active = false; clearTimeout(timer); };
  }, [term, gateway, navigate]);

  const { data: chats, isLoading } = useQuery({
    queryKey: ["chats", userId],
    enabled: !!userId,
    refetchInterval: 10000,
    queryFn: () => loadChats(userId ?? ""),
  });

  const { data: announcement } = useQuery({
    queryKey: ["latest-announcement"],
    queryFn: async () => {
      const { data } = await supabase
        .from("announcements")
        .select("title, body, created_at")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  const filtered = filterConversations(
    (chats ?? []).filter((chat) => chat.title.toLowerCase().includes(term.trim().toLowerCase())),
    filter,
  );

  async function removeFromScreen(chat: ChatSummary) {
    if (!userId) return;
    setActionBusy(true);
    try {
      await hideChat(userId, chat.id);
      await queryClient.invalidateQueries({ queryKey: ["chats", userId] });
      setActiveChat(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not remove conversation");
    } finally {
      setActionBusy(false);
    }
  }

  async function exitGroup(chat: ChatSummary) {
    if (!userId) return;
    setActionBusy(true);
    try {
      await leaveGroup(chat.id, userId);
      await hideChat(userId, chat.id);
      await queryClient.invalidateQueries({ queryKey: ["chats", userId] });
      setActiveChat(null);
      toast.success("You left the group");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not leave the group");
    } finally {
      setActionBusy(false);
    }
  }

  return (
    <AppShell>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold animate-rise">Conversations</h1>
          <p className="mt-1 text-xs text-muted-foreground">Chats and groups, together</p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="icon" className="size-11 border-border bg-card text-primary">
            <Link to="/groups" aria-label="Create a group" title="Create a group"><Users className="size-5" /></Link>
          </Button>
          <Button asChild variant="outline" size="icon" className="size-11 border-border bg-card text-primary">
            <Link to="/new" aria-label="Start a conversation" title="Start a conversation"><Plus className="size-5" /></Link>
          </Button>
        </div>
      </div>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Search chats"
          aria-label="Search chats"
          className="w-full rounded-lg border border-input bg-card py-3.5 pl-10 pr-4 text-sm shadow-soft outline-none focus:border-ring"
        />
      </div>

      <div className="mt-4 flex gap-2" aria-label="Conversation type">
        {(["all", "direct", "groups"] as const).map((item) => (
          <Button
            key={item}
            type="button"
            variant={filter === item ? "secondary" : "ghost"}
            aria-pressed={filter === item}
            onClick={() => setFilter(item)}
            className="h-9 min-w-16 px-3 text-xs capitalize"
          >
            {item === "direct" ? "Direct" : item === "groups" ? "Groups" : "All"}
          </Button>
        ))}
      </div>

      {announcement ? (
        <div className="mt-4 border-l-2 border-accent bg-accent/5 p-4">
          <p className="flex items-center gap-2 text-xs font-bold tracking-wide text-accent">
            <Megaphone className="size-4" /> 👑 JARVIS 👑
          </p>
          <p className="mt-1 text-sm font-semibold">{announcement.title}</p>
          <p className="text-xs text-muted-foreground">{announcement.body}</p>
        </div>
      ) : null}

      <h2 className="mt-6 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Recent conversations</h2>

      {isLoading ? (
        <p className="mt-6 text-sm text-muted-foreground">Loading conversations…</p>
      ) : filtered.length === 0 ? (
        <div className="mt-8 border-y border-border py-10 text-center">
          <p className="text-sm font-semibold">{(chats ?? []).length ? "No matches in this view" : "No conversations yet"}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {(chats ?? []).length ? "Try another filter or search." : "Start a chat by searching for someone’s username."}
          </p>
          {(chats ?? []).length === 0 ? <Button asChild className="mt-4"><Link to="/new">Start a chat</Link></Button> : null}
        </div>
      ) : (
        <ul className="mt-3 space-y-2 stagger">
          {filtered.map((chat) => (
            <li
              key={chat.id}
              onContextMenu={(event) => { event.preventDefault(); setActiveChat(chat); }}
            >
              <Link
                to="/c/$chatId"
                params={{ chatId: chat.id }}
                className="flex min-h-20 items-center gap-3 rounded-lg border border-border/70 bg-card p-3.5 shadow-soft transition-colors hover:border-accent/40 hover:bg-secondary/60"
              >
                <ProfileAvatar src={chat.avatarUrl} name={chat.title} />
                <span className="min-w-0 flex-1">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="block min-w-0 truncate text-base font-semibold">{chat.title}</span>
                    <span className="shrink-0 rounded-sm bg-secondary px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-secondary-foreground">
                      {chat.isGroup ? "Group" : "User Chat"}
                    </span>
                  </span>
                  <span className="mt-1 block truncate text-sm text-muted-foreground">
                    {chat.isGroup ? `${chat.memberCount} members${chat.subtitle ? ` · ${chat.subtitle}` : ""}` : chat.subtitle}
                  </span>
                </span>
              </Link>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute -mt-[4.25rem] right-8 z-10 size-9 text-muted-foreground sm:right-[max(calc((100vw-48rem)/2+1.5rem),1rem)]"
                aria-label={`Conversation actions for ${chat.title}`}
                onClick={() => setActiveChat(chat)}
              >
                <MoreHorizontal className="size-5" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      {activeChat ? (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-scrim" onClick={() => setActiveChat(null)}>
          <section
            role="dialog"
            aria-modal="true"
            aria-label={`${activeChat.title} conversation actions`}
            className="w-full max-w-3xl space-y-2 rounded-t-lg border border-border bg-card p-4 pb-[max(env(safe-area-inset-bottom),1rem)] shadow-soft"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="mb-3 text-sm font-semibold">{activeChat.title}</p>
            <Button asChild variant="ghost" className="w-full justify-start">
              <Link to="/c/$chatId" params={{ chatId: activeChat.id }}><MessageCircle className="size-4" /> Open conversation</Link>
            </Button>
            {activeChat.isGroup ? (
              <>
                <Button type="button" variant="secondary" disabled={actionBusy} onClick={() => void exitGroup(activeChat)} className="w-full justify-start">Leave group</Button>
                <p className="px-2 text-xs text-muted-foreground">Leaving removes you from the group; its history remains saved.</p>
              </>
            ) : (
              <Button type="button" variant="secondary" disabled={actionBusy} onClick={() => void removeFromScreen(activeChat)} className="w-full justify-start">Remove from my screen</Button>
            )}
            <Button type="button" variant="ghost" onClick={() => setActiveChat(null)} className="w-full">Cancel</Button>
          </section>
        </div>
      ) : null}

      <Link
        to="/new"
        aria-label="New chat"
        className="brand-gradient fixed bottom-24 right-5 z-20 flex size-14 items-center justify-center rounded-full text-primary-foreground shadow-soft"
      >
        <Plus className="size-6" />
      </Link>
    </AppShell>
  );
}
