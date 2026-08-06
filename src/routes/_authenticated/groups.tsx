import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { useAccount } from "@/hooks/useAccount";
import { createGroup, loadChats, searchProfiles } from "@/lib/chat-client";

export const Route = createFileRoute("/_authenticated/groups")({
  head: () => ({
    meta: [
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

  const { data: groups, isLoading } = useQuery({
    queryKey: ["groups", userId],
    enabled: !!userId,
    queryFn: () => loadChats(userId!, true),
  });

  const { data: people } = useQuery({
    queryKey: ["people", term, userId],
    enabled: !!userId && creating && term.trim().length > 1,
    queryFn: () => searchProfiles(term.trim(), userId!),
  });

  async function submit() {
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
      const id = await createGroup(userId!, name.trim(), selected);
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
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Groups</h2>
        <button
          onClick={() => setCreating((v) => !v)}
          className="flex items-center gap-1 rounded-xl bg-secondary px-3 py-1.5 text-xs font-semibold text-secondary-foreground"
        >
          <Plus className="size-3.5" /> New group
        </button>
      </div>

      {creating ? (
        <div className="mt-4 space-y-3 rounded-2xl border border-border bg-card p-4 shadow-soft">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Group name"
            className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-ring"
          />
          <input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Search members by username"
            className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-ring"
          />
          <ul className="max-h-52 space-y-1 overflow-y-auto">
            {(people ?? []).map((p) => (
              <li key={p.id}>
                <button
                  onClick={() =>
                    setSelected((s) => (s.includes(p.id) ? s.filter((x) => x !== p.id) : [...s, p.id]))
                  }
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm ${
                    selected.includes(p.id) ? "bg-primary/10 text-primary" : "bg-muted"
                  }`}
                >
                  <span>{p.display_name}</span>
                  <span className="text-xs text-muted-foreground">@{p.username}</span>
                </button>
              </li>
            ))}
          </ul>
          <button
            onClick={submit}
            disabled={busy}
            className="brand-gradient w-full rounded-xl py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            {busy ? "Creating…" : `Create group (${selected.length} members)`}
          </button>
        </div>
      ) : null}

      {isLoading ? (
        <p className="mt-6 text-sm text-muted-foreground">Loading groups…</p>
      ) : (groups ?? []).length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-border p-8 text-center">
          <p className="text-sm font-semibold">No groups yet</p>
          <p className="mt-1 text-xs text-muted-foreground">Create a group to start a conversation.</p>
        </div>
      ) : (
        <ul className="mt-4 space-y-2">
          {(groups ?? []).map((g) => (
            <li key={g.id}>
              <Link
                to="/c/$chatId"
                params={{ chatId: g.id }}
                className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-soft"
              >
                <span className="flex size-11 items-center justify-center rounded-full bg-secondary text-sm font-bold text-secondary-foreground">
                  {g.title.charAt(0).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{g.title}</span>
                  <span className="block truncate text-xs text-muted-foreground">{g.subtitle}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}