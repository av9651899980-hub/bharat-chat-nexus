import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { useAccount } from "@/hooks/useAccount";
import { searchProfiles } from "@/lib/chat-client";
import { ProfileAvatar } from "@/components/profile-avatar";

export const Route = createFileRoute("/_authenticated/new")({
  head: () => ({
    meta: [
      { title: "Start a chat — BharatChat" },
      { name: "description", content: "Find a BharatChat user by username and start a conversation." },
      { property: "og:title", content: "Start a chat — BharatChat" },
      { property: "og:description", content: "Find people on BharatChat and start chatting." },
    ],
  }),
  component: NewChatPage,
});

function NewChatPage() {
  const { userId } = useAccount();
  const navigate = useNavigate();
  const [term, setTerm] = useState("");

  const { data: people, isFetching } = useQuery({
    queryKey: ["search-people", term, userId],
    enabled: !!userId && term.trim().length > 1,
    queryFn: () => searchProfiles(term.trim(), userId!),
  });

  return (
    <AppShell>
      <button
        onClick={() => navigate({ to: "/chats" })}
        className="mb-4 flex items-center gap-1 text-sm text-muted-foreground"
      >
        <ArrowLeft className="size-4" /> Back
      </button>

      <h1 className="text-lg font-bold">Start a chat</h1>
      <input
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        placeholder="Search by username or name"
        className="mt-3 w-full rounded-2xl border border-input bg-card px-4 py-3 text-sm outline-none focus:border-ring"
      />

      {term.trim().length < 2 ? (
        <p className="mt-6 text-xs text-muted-foreground">Type at least 2 characters to search.</p>
      ) : isFetching ? (
        <p className="mt-6 text-xs text-muted-foreground">Searching…</p>
      ) : (people ?? []).length === 0 ? (
        <p className="mt-6 text-xs text-muted-foreground">No accounts matched that search.</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {(people ?? []).map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => navigate({ to: "/u/$userId", params: { userId: p.id } })}
                className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-3 text-left shadow-soft active:opacity-80"
              >
                <ProfileAvatar src={p.avatar_url} name={p.display_name} className="size-10" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">{p.display_name}</span>
                  <span className="block text-xs text-muted-foreground">@{p.username}</span>
                </span>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}