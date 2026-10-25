import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { searchOwnerGateway } from "@/lib/owner-gateway.functions";
import { useQuery } from "@tanstack/react-query";
import { Plus, Search, Megaphone } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { useAccount } from "@/hooks/useAccount";
import { loadChats } from "@/lib/chat-client";
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
    queryFn: () => loadChats(userId ?? "", false),
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

  const filtered = (chats ?? []).filter((c) =>
    c.title.toLowerCase().includes(term.trim().toLowerCase()),
  );

  return (
    <AppShell>
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-2xl font-bold animate-rise">Conversations</h1>
        <Button
          asChild
          variant="outline"
          size="icon"
          className="size-11 border-border bg-card text-primary"
        >
          <Link to="/new" aria-label="Start a conversation" title="Start a conversation">
            <Plus className="size-5" />
          </Link>
        </Button>
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

      {announcement ? (
        <div className="mt-4 border-l-2 border-accent bg-accent/5 p-4">
          <p className="flex items-center gap-2 text-xs font-bold tracking-wide text-accent">
            <Megaphone className="size-4" /> 👑 JARVIS 👑
          </p>
          <p className="mt-1 text-sm font-semibold">{announcement.title}</p>
          <p className="text-xs text-muted-foreground">{announcement.body}</p>
        </div>
      ) : null}

      <h2 className="mt-6 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Recent chats
      </h2>

      {isLoading ? (
        <p className="mt-6 text-sm text-muted-foreground">Loading conversations…</p>
      ) : filtered.length === 0 ? (
        <div className="mt-8 border-y border-border py-10 text-center">
          <p className="text-sm font-semibold">No conversations yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Start a chat by searching for someone&apos;s username.
          </p>
          <Button asChild className="mt-4">
            <Link to="/new">Start a chat</Link>
          </Button>
        </div>
      ) : (
        <ul className="mt-3 space-y-2 stagger">
          {filtered.map((chat) => (
            <li key={chat.id}>
              <Link
                to="/c/$chatId"
                params={{ chatId: chat.id }}
                className="flex min-h-20 items-center gap-3.5 rounded-lg border border-border/70 bg-card p-4 shadow-soft transition-colors hover:border-accent/40 hover:bg-secondary/60"
              >
                <ProfileAvatar src={chat.avatarUrl} name={chat.title} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-base font-semibold">{chat.title}</span>
                  <span className="mt-1 block truncate text-sm text-muted-foreground">
                    {chat.subtitle}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

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
