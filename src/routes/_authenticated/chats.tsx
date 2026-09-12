import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Search, Megaphone } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { useAccount } from "@/hooks/useAccount";
import { loadChats } from "@/lib/chat-client";
import { supabase } from "@/integrations/supabase/client";
import { ProfileAvatar } from "@/components/profile-avatar";

export const Route = createFileRoute("/_authenticated/chats")({
  head: () => ({
    meta: [
      { title: "Chats — BharatChat" },
      { name: "description", content: "Your recent BharatChat conversations, groups and announcements." },
      { property: "og:title", content: "Chats — BharatChat" },
      { property: "og:description", content: "Your recent BharatChat conversations." },
    ],
  }),
  component: ChatsPage,
});

function ChatsPage() {
  const { userId } = useAccount();
  const [term, setTerm] = useState("");

  const { data: chats, isLoading } = useQuery({
    queryKey: ["chats", userId],
    enabled: !!userId,
    refetchInterval: 10000,
    queryFn: () => loadChats(userId!, false),
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
      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Search chats"
          className="w-full rounded-2xl border border-input bg-card py-3 pl-10 pr-4 text-sm outline-none focus:border-ring"
        />
      </div>

      {announcement ? (
        <div className="mt-4 rounded-2xl border border-accent/40 bg-accent/10 p-4">
          <p className="flex items-center gap-2 text-xs font-bold tracking-wide text-accent-foreground">
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
        <div className="mt-10 rounded-2xl border border-dashed border-border p-8 text-center">
          <p className="text-sm font-semibold">No conversations yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Start a chat by searching for someone&apos;s username.
          </p>
          <Link
            to="/new"
            className="brand-gradient mt-4 inline-block rounded-xl px-4 py-2 text-xs font-semibold text-primary-foreground"
          >
            Start a chat
          </Link>
        </div>
      ) : (
        <ul className="mt-3 space-y-2">
          {filtered.map((chat) => (
            <li key={chat.id}>
              <Link
                to="/c/$chatId"
                params={{ chatId: chat.id }}
                className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-soft"
              >
                <ProfileAvatar src={chat.avatarUrl} name={chat.title} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{chat.title}</span>
                  <span className="block truncate text-xs text-muted-foreground">{chat.subtitle}</span>
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