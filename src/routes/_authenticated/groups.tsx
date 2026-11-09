import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, Users } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { useAccount } from "@/hooks/useAccount";
import { createGroup, searchProfiles } from "@/lib/chat-client";
import { Button } from "@/components/ui/button";
import { ProfileAvatar } from "@/components/profile-avatar";

export const Route = createFileRoute("/_authenticated/groups")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Groups — BharatChat" },
      { name: "description", content: "Create and manage your BharatChat groups and group members." },
      { property: "og:title", content: "Groups — BharatChat" },
      { property: "og:description", content: "Create and manage BharatChat groups." },
    ],
  }),
  component: GroupsPage,
});

function GroupsPage() {
  const { userId } = useAccount();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [term, setTerm] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const { data: people } = useQuery({
    queryKey: ["people", term, userId],
    enabled: !!userId && creating && term.trim().length > 1,
    queryFn: () => searchProfiles(term.trim(), userId ?? ""),
  });

  async function submit() {
    if (!userId) return;
    if (!name.trim()) {
      toast.error("Give the group a name");
      return;
    }
    if (selected.length === 0) {
      toast.error("Select at least one other member");
      return;
    }
    setBusy(true);
    try {
      const id = await createGroup(userId, name.trim(), selected);
      await queryClient.invalidateQueries({ queryKey: ["groups"] });
      setCreating(false);
      setName("");
      setTerm("");
      setSelected([]);
      toast.success("Group created");
      navigate({ to: "/c/$chatId", params: { chatId: id } });
    } catch (err) {
      toast.error(`Group creation failed: ${err instanceof Error ? err.message : "unknown error"}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell>
      <div className="mb-5 flex items-center gap-3">
        <Button variant="ghost" size="icon" aria-label="Back to conversations" onClick={() => navigate({ to: "/chats" })}>
          <ArrowLeft className="size-5" />
        </Button>
        <div><h1 className="text-2xl font-bold">Create a group</h1><p className="mt-1 text-xs text-muted-foreground">Start a shared conversation</p></div>
      </div>

      <div className="space-y-3 border-y border-border py-5">
          <input
            aria-label="Group name" maxLength={60}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Group name"
            className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-ring"
          />
          <input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            aria-label="Search members" placeholder="Search members by username"
            className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-ring"
          />
          <ul className="max-h-52 space-y-1 overflow-y-auto">
            {(people ?? []).map((p) => (
              <li key={p.id}>
                <Button
                  onClick={() =>
                    setSelected((s) => (s.includes(p.id) ? s.filter((x) => x !== p.id) : [...s, p.id]))
                  }
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm ${
                    selected.includes(p.id) ? "bg-primary/10 text-primary" : "bg-muted"
                  }`}
                >
                  <span className="flex items-center gap-2"><ProfileAvatar src={p.avatar_url} name={p.display_name} className="size-8" textClassName="text-xs" />{p.display_name}</span>
                  <span className="flex items-center gap-2 text-xs text-muted-foreground">@{p.username}{selected.includes(p.id) ? <Check className="size-4 text-primary" /> : null}</span>
                </Button>
              </li>
            ))}
          </ul>
          <Button
            onClick={submit}
            disabled={busy}
            className="brand-gradient w-full rounded-lg py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            {busy ? "Creating…" : `Create group (${selected.length} members)`}
          </Button>
        <div className="flex items-center gap-2 border-t border-border pt-3 text-xs text-muted-foreground"><Users className="size-4" /> Groups will appear with your chats.</div>
      </div>
    </AppShell>
  );
}
