import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  ShieldCheck,
  Users as UsersIcon,
  MessageSquare,
  UsersRound,
  BadgeCheck,
  Flag,
  Megaphone,
  BarChart3,
  ScrollText,
  ChevronLeft,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import {
  powersContext,
  powersUsers,
  powersSetUserStatus,
  powersWarnUser,
  powersChats,
  powersMessages,
  powersDeleteMessage,
  powersGroupAction,
  powersStaff,
  powersReviewApplication,
  powersSetRole,
  powersReports,
  powersUpdateReport,
  powersAnnouncements,
  powersAnnouncementAction,
  powersAnalytics,
  powersActivityLogs,
} from "@/lib/powers.functions";

export const Route = createFileRoute("/_authenticated/powers")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Staff Powers — BharatChat" },
      { name: "description", content: "Operational staff actions available for your BharatChat rank." },
      { property: "og:title", content: "Staff Powers — BharatChat" },
      { property: "og:description", content: "Operational staff actions for your BharatChat rank." },
    ],
  }),
  component: PowersPage,
});

type PanelId =
  | "users"
  | "moderation"
  | "groups"
  | "staff"
  | "reports"
  | "announcements"
  | "analytics"
  | "activity";

type Power = {
  id: string;
  label: string;
  description: string;
  permission: string;
  panel: PanelId;
};

const CATEGORIES: { title: string; icon: typeof UsersIcon; powers: Power[] }[] = [
  {
    title: "User management",
    icon: UsersIcon,
    powers: [
      { id: "view_users", label: "View users", description: "Search the directory and open account details.", permission: "view_staff_panel", panel: "users" },
      { id: "warn", label: "Warn user", description: "Send an official staff warning to an account.", permission: "warn_user", panel: "users" },
      { id: "restrict", label: "Restrict / restore user", description: "Limit an account, or restore it to active.", permission: "restrict_user", panel: "users" },
      { id: "suspend", label: "Suspend user", description: "Suspend an account's access immediately.", permission: "suspend_user", panel: "users" },
    ],
  },
  {
    title: "Message moderation",
    icon: MessageSquare,
    powers: [
      { id: "view_messages", label: "Moderate messages", description: "Review conversation transcripts.", permission: "view_chats", panel: "moderation" },
      { id: "delete_message", label: "Delete any message", description: "Remove a message from any conversation.", permission: "delete_message", panel: "moderation" },
    ],
  },
  {
    title: "Group management",
    icon: UsersRound,
    powers: [
      { id: "view_groups", label: "View groups", description: "Browse every group and its members.", permission: "view_chats", panel: "groups" },
      { id: "group_members", label: "Manage group members", description: "Remove members, promote or demote group admins.", permission: "manage_group_members", panel: "groups" },
      { id: "group_settings", label: "Edit group settings", description: "Rename a group or change who can send.", permission: "manage_group_settings", panel: "groups" },
      { id: "delete_group", label: "Delete group", description: "Permanently remove a group.", permission: "delete_group", panel: "groups" },
    ],
  },
  {
    title: "Staff management",
    icon: BadgeCheck,
    powers: [
      { id: "view_staff", label: "View staff", description: "See the staff roster and applications.", permission: "view_staff_panel", panel: "staff" },
      { id: "review_apps", label: "Review staff applications", description: "Approve with a rank, or reject with a reason.", permission: "review_staff_applications", panel: "staff" },
      { id: "assign_roles", label: "Change / remove staff rank", description: "Assign ranks below your own authority.", permission: "assign_roles", panel: "staff" },
    ],
  },
  {
    title: "Reports",
    icon: Flag,
    powers: [
      { id: "view_reports", label: "View reports", description: "Read user-submitted reports.", permission: "view_reports", panel: "reports" },
      { id: "resolve_reports", label: "Resolve reports", description: "Review, resolve or dismiss a report.", permission: "resolve_reports", panel: "reports" },
    ],
  },
  {
    title: "Announcements",
    icon: Megaphone,
    powers: [
      { id: "announce", label: "Manage announcements", description: "Create, edit or delete announcements.", permission: "send_announcement", panel: "announcements" },
    ],
  },
  {
    title: "Analytics",
    icon: BarChart3,
    powers: [
      { id: "analytics", label: "View analytics", description: "Live platform figures from real data.", permission: "view_analytics", panel: "analytics" },
    ],
  },
  {
    title: "Activity",
    icon: ScrollText,
    powers: [
      { id: "activity", label: "View activity logs", description: "Audit trail of privileged staff actions.", permission: "view_activity_logs", panel: "activity" },
    ],
  },
];

/* ------------------------------ shared bits ------------------------------ */

function Card({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl border border-border/70 bg-card p-4">{children}</div>;
}

function ActionButton({
  children,
  onClick,
  tone = "default",
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  tone?: "default" | "danger";
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rounded-xl px-3 py-1.5 text-xs font-semibold disabled:opacity-50 ${
        tone === "danger"
          ? "bg-destructive text-destructive-foreground"
          : "bg-secondary text-secondary-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function Confirm({
  message,
  onCancel,
  onConfirm,
  busy,
}: {
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
  busy: boolean;
}) {
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 p-4 sm:items-center">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-4">
        <p className="text-sm text-foreground">{message}</p>
        <div className="mt-4 flex justify-end gap-2">
          <ActionButton onClick={onCancel} disabled={busy}>
            Cancel
          </ActionButton>
          <ActionButton onClick={onConfirm} tone="danger" disabled={busy}>
            {busy ? "Working…" : "Confirm"}
          </ActionButton>
        </div>
      </div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="py-8 text-center text-xs text-muted-foreground">{text}</p>;
}

function useAction() {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  async function run(fn: () => Promise<unknown>, success: string, keys: string[] = []) {
    setBusy(true);
    try {
      await fn();
      await Promise.all(keys.map((k) => queryClient.invalidateQueries({ queryKey: [k] })));
      await queryClient.invalidateQueries({ queryKey: ["powers-context"] });
      toast.success(success);
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed");
      return false;
    } finally {
      setBusy(false);
    }
  }
  return { busy, run };
}

/* --------------------------------- page --------------------------------- */

function PowersPage() {
  const fetchContext = useServerFn(powersContext);
  const [panel, setPanel] = useState<PanelId | null>(null);

  const ctx = useQuery({
    queryKey: ["powers-context"],
    queryFn: () => fetchContext({ data: undefined as never }),
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
  });

  const permissions = ctx.data?.permissions ?? [];
  const can = (p: string) => permissions.includes(p);

  const visible = useMemo(
    () =>
      CATEGORIES.map((c) => ({ ...c, powers: c.powers.filter((p) => can(p.permission)) })).filter(
        (c) => c.powers.length > 0,
      ),
    [permissions.join(",")],
  );

  if (ctx.isLoading) {
    return (
      <AppShell title="Staff Powers">
        <p className="py-10 text-center text-xs text-muted-foreground">Loading your permissions…</p>
      </AppShell>
    );
  }

  if (ctx.isError) {
    return (
      <AppShell title="Staff Powers">
        <Card>
          <p className="text-sm text-destructive">Could not load your permissions.</p>
          <div className="mt-3">
            <ActionButton onClick={() => ctx.refetch()}>Try again</ActionButton>
          </div>
        </Card>
      </AppShell>
    );
  }

  if (!ctx.data?.isStaff) {
    return (
      <AppShell title="Staff Powers">
        <Card>
          <h2 className="text-sm font-bold uppercase tracking-wide">No powers available</h2>
          <p className="mt-2 text-xs text-muted-foreground">
            This area is only available to BharatChat staff.
          </p>
        </Card>
      </AppShell>
    );
  }

  if (panel) {
    return (
      <AppShell title="Staff Powers">
        <button
          onClick={() => setPanel(null)}
          className="mb-3 flex items-center gap-1 text-xs font-semibold text-muted-foreground"
        >
          <ChevronLeft className="size-4" /> All powers
        </button>
        {panel === "users" ? <UsersPanel can={can} /> : null}
        {panel === "moderation" ? <ModerationPanel can={can} /> : null}
        {panel === "groups" ? <GroupsPanel can={can} /> : null}
        {panel === "staff" ? <StaffPanel can={can} assignable={ctx.data.assignableRoles} /> : null}
        {panel === "reports" ? <ReportsPanel can={can} /> : null}
        {panel === "announcements" ? <AnnouncementsPanel /> : null}
        {panel === "analytics" ? <AnalyticsPanel /> : null}
        {panel === "activity" ? <ActivityPanel /> : null}
      </AppShell>
    );
  }

  return (
    <AppShell title="Staff Powers">
      <div className="rounded-2xl border border-border/70 bg-card p-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-5 text-primary" />
          <h1 className="text-sm font-bold uppercase tracking-wider">Staff Powers</h1>
          <span className="rounded-full border border-accent/50 bg-accent/15 px-2 py-[2px] text-[10px] font-bold uppercase tracking-wide text-accent-foreground">
            {ctx.data.role}
          </span>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Your available administrative actions</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Available permissions: <span className="font-semibold text-foreground">{permissions.length}</span>
        </p>
      </div>

      {visible.length === 0 ? (
        <div className="mt-4">
          <Card>
            <h2 className="text-sm font-bold uppercase tracking-wide">No powers available</h2>
            <p className="mt-2 text-xs text-muted-foreground">
              Your current staff role does not have any operational powers.
            </p>
          </Card>
        </div>
      ) : null}

      <div className="mt-4 space-y-5">
        {visible.map((category) => (
          <section key={category.title}>
            <h2 className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <category.icon className="size-3.5" /> {category.title}
            </h2>
            <div className="space-y-2">
              {category.powers.map((power) => (
                <div
                  key={power.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-card p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">{power.label}</p>
                    <p className="text-xs text-muted-foreground">{power.description}</p>
                  </div>
                  <ActionButton onClick={() => setPanel(power.panel)}>Open</ActionButton>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </AppShell>
  );
}

/* ------------------------------- users panel ------------------------------ */

function UsersPanel({ can }: { can: (p: string) => boolean }) {
  const fetchUsers = useServerFn(powersUsers);
  const setStatus = useServerFn(powersSetUserStatus);
  const warn = useServerFn(powersWarnUser);
  const { busy, run } = useAction();
  const [term, setTerm] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [warning, setWarning] = useState("");
  const [confirm, setConfirm] = useState<{ message: string; act: () => Promise<unknown> } | null>(null);

  const users = useQuery({
    queryKey: ["powers-users", term],
    queryFn: () => fetchUsers({ data: { query: term.trim() || undefined } }),
  });

  const user = users.data?.find((u) => u.id === selected) ?? null;

  return (
    <div className="space-y-3">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">User management</h2>
      <input
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        placeholder="Search by name or username"
        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
      />
      {users.isLoading ? <Empty text="Loading users…" /> : null}
      {users.isError ? <Empty text="Could not load users." /> : null}

      {user ? (
        <Card>
          <button onClick={() => setSelected(null)} className="text-xs text-muted-foreground">
            ← Back to list
          </button>
          <p className="mt-2 text-sm font-bold">{user.display_name}</p>
          <p className="text-xs text-muted-foreground">@{user.username}</p>
          <p className="mt-2 text-xs text-muted-foreground">Status: <span className="font-semibold text-foreground">{user.status}</span></p>
          {user.roles.length ? (
            <p className="text-xs text-muted-foreground">Rank: {user.roles.join(", ")}</p>
          ) : null}
          {user.bio ? <p className="mt-2 text-xs text-foreground">{user.bio}</p> : null}

          <div className="mt-3 flex flex-wrap gap-2">
            {can("restrict_user") && user.status !== "restricted" ? (
              <ActionButton
                onClick={() =>
                  setConfirm({
                    message: `Restrict ${user.display_name}?`,
                    act: () => setStatus({ data: { userId: user.id, status: "restricted" } }),
                  })
                }
              >
                Restrict
              </ActionButton>
            ) : null}
            {can("suspend_user") && user.status !== "suspended" ? (
              <ActionButton
                tone="danger"
                onClick={() =>
                  setConfirm({
                    message: `Suspend ${user.display_name}? They will lose access.`,
                    act: () => setStatus({ data: { userId: user.id, status: "suspended" } }),
                  })
                }
              >
                Suspend
              </ActionButton>
            ) : null}
            {(can("restrict_user") || can("suspend_user")) && user.status !== "active" ? (
              <ActionButton
                onClick={() =>
                  setConfirm({
                    message: `Restore ${user.display_name} to active?`,
                    act: () => setStatus({ data: { userId: user.id, status: "active" } }),
                  })
                }
              >
                Restore
              </ActionButton>
            ) : null}
          </div>

          {can("warn_user") ? (
            <div className="mt-3">
              <textarea
                value={warning}
                onChange={(e) => setWarning(e.target.value)}
                rows={2}
                placeholder="Warning message"
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
              />
              <div className="mt-2">
                <ActionButton
                  disabled={busy || warning.trim().length < 3}
                  onClick={() =>
                    run(
                      () => warn({ data: { userId: user.id, message: warning.trim() } }),
                      "Warning sent",
                      ["powers-users"],
                    ).then((ok) => ok && setWarning(""))
                  }
                >
                  Send warning
                </ActionButton>
              </div>
            </div>
          ) : null}
        </Card>
      ) : (
        <div className="space-y-2">
          {(users.data ?? []).map((u) => (
            <button
              key={u.id}
              onClick={() => setSelected(u.id)}
              className="flex w-full items-center justify-between rounded-2xl border border-border/70 bg-card p-3 text-left"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{u.display_name}</p>
                <p className="truncate text-xs text-muted-foreground">@{u.username}</p>
              </div>
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{u.status}</span>
            </button>
          ))}
          {users.data && users.data.length === 0 ? <Empty text="No users found." /> : null}
        </div>
      )}

      {confirm ? (
        <Confirm
          message={confirm.message}
          busy={busy}
          onCancel={() => setConfirm(null)}
          onConfirm={() =>
            run(confirm.act, "Account updated", ["powers-users"]).then(() => setConfirm(null))
          }
        />
      ) : null}
    </div>
  );
}

/* ---------------------------- moderation panel ---------------------------- */

function ModerationPanel({ can }: { can: (p: string) => boolean }) {
  const fetchChats = useServerFn(powersChats);
  const fetchMessages = useServerFn(powersMessages);
  const remove = useServerFn(powersDeleteMessage);
  const { busy, run } = useAction();
  const [chatId, setChatId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const chats = useQuery({ queryKey: ["powers-chats"], queryFn: () => fetchChats({ data: {} }) });
  const messages = useQuery({
    queryKey: ["powers-messages", chatId],
    enabled: !!chatId,
    queryFn: () => fetchMessages({ data: { chatId: chatId! } }),
  });

  if (!chatId) {
    return (
      <div className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Message moderation</h2>
        {chats.isLoading ? <Empty text="Loading conversations…" /> : null}
        {chats.isError ? <Empty text="Could not load conversations." /> : null}
        {(chats.data ?? []).map((c) => (
          <button
            key={c.id}
            onClick={() => setChatId(c.id)}
            className="w-full rounded-2xl border border-border/70 bg-card p-3 text-left"
          >
            <p className="text-sm font-semibold">
              {c.is_group ? (c.name ?? "Group") : c.members.map((m) => m.displayName).join(" · ")}
            </p>
            <p className="text-xs text-muted-foreground">{c.is_group ? "Group" : "Direct chat"}</p>
          </button>
        ))}
        {chats.data && chats.data.length === 0 ? <Empty text="No conversations yet." /> : null}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <button onClick={() => setChatId(null)} className="text-xs text-muted-foreground">
        ← Back to conversations
      </button>
      {messages.isLoading ? <Empty text="Loading messages…" /> : null}
      {(messages.data ?? []).map((m) => (
        <div key={m.id} className="rounded-2xl border border-border/70 bg-card p-3">
          <p className="text-xs font-semibold text-muted-foreground">
            {(m.profiles as { display_name?: string } | null)?.display_name ?? "Unknown"}
          </p>
          <p className="mt-1 break-words text-sm">
            {m.deleted_at ? <em className="text-muted-foreground">Deleted</em> : (m.content ?? `[${m.kind}]`)}
          </p>
          {can("delete_message") && !m.deleted_at ? (
            <div className="mt-2">
              <ActionButton tone="danger" onClick={() => setConfirmId(m.id)}>
                Delete
              </ActionButton>
            </div>
          ) : null}
        </div>
      ))}
      {messages.data && messages.data.length === 0 ? <Empty text="No messages in this chat." /> : null}

      {confirmId ? (
        <Confirm
          message="Delete this message for everyone?"
          busy={busy}
          onCancel={() => setConfirmId(null)}
          onConfirm={() =>
            run(() => remove({ data: { messageId: confirmId } }), "Message deleted", [
              "powers-messages",
            ]).then(() => setConfirmId(null))
          }
        />
      ) : null}
    </div>
  );
}

/* ------------------------------ groups panel ------------------------------ */

function GroupsPanel({ can }: { can: (p: string) => boolean }) {
  const fetchChats = useServerFn(powersChats);
  const action = useServerFn(powersGroupAction);
  const { busy, run } = useAction();
  const [groupId, setGroupId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [confirm, setConfirm] = useState<{ message: string; act: () => Promise<unknown> } | null>(null);

  const groups = useQuery({
    queryKey: ["powers-groups"],
    queryFn: () => fetchChats({ data: { group: true } }),
  });
  const group = groups.data?.find((g) => g.id === groupId) ?? null;

  if (!group) {
    return (
      <div className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Group management</h2>
        {groups.isLoading ? <Empty text="Loading groups…" /> : null}
        {groups.isError ? <Empty text="Could not load groups." /> : null}
        {(groups.data ?? []).map((g) => (
          <button
            key={g.id}
            onClick={() => {
              setGroupId(g.id);
              setName(g.name ?? "");
            }}
            className="w-full rounded-2xl border border-border/70 bg-card p-3 text-left"
          >
            <p className="text-sm font-semibold">{g.name ?? "Group"}</p>
            <p className="text-xs text-muted-foreground">{g.members.length} members</p>
          </button>
        ))}
        {groups.data && groups.data.length === 0 ? <Empty text="No groups yet." /> : null}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <button onClick={() => setGroupId(null)} className="text-xs text-muted-foreground">
        ← Back to groups
      </button>
      <Card>
        <p className="text-sm font-bold">{group.name ?? "Group"}</p>
        <p className="text-xs text-muted-foreground">{group.members.length} members</p>

        {can("manage_group_settings") ? (
          <div className="mt-3 space-y-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
            />
            <div className="flex flex-wrap gap-2">
              <ActionButton
                disabled={busy || !name.trim()}
                onClick={() =>
                  run(
                    () => action({ data: { action: "update", groupId: group.id, name: name.trim() } }),
                    "Group updated",
                    ["powers-groups"],
                  )
                }
              >
                Save name
              </ActionButton>
              <ActionButton
                disabled={busy}
                onClick={() =>
                  run(
                    () =>
                      action({
                        data: {
                          action: "update",
                          groupId: group.id,
                          onlyAdminsSend: !group.only_admins_send,
                        },
                      }),
                    "Group permissions updated",
                    ["powers-groups"],
                  )
                }
              >
                {group.only_admins_send ? "Allow everyone to send" : "Only admins can send"}
              </ActionButton>
            </div>
          </div>
        ) : null}

        {can("delete_group") ? (
          <div className="mt-3">
            <ActionButton
              tone="danger"
              onClick={() =>
                setConfirm({
                  message: `Permanently delete "${group.name ?? "this group"}" and all its messages?`,
                  act: () => action({ data: { action: "delete", groupId: group.id } }),
                })
              }
            >
              Delete group
            </ActionButton>
          </div>
        ) : null}
      </Card>

      <div className="space-y-2">
        {group.members.map((m) => (
          <div key={m.userId} className="rounded-2xl border border-border/70 bg-card p-3">
            <p className="text-sm font-semibold">{m.displayName}</p>
            <p className="text-xs text-muted-foreground">
              @{m.username}
              {m.isAdmin ? " · group admin" : ""}
            </p>
            {can("manage_group_members") ? (
              <div className="mt-2 flex flex-wrap gap-2">
                <ActionButton
                  disabled={busy}
                  onClick={() =>
                    run(
                      () =>
                        action({
                          data: {
                            action: m.isAdmin ? "demote" : "promote",
                            groupId: group.id,
                            userId: m.userId,
                          },
                        }),
                      m.isAdmin ? "Group admin removed" : "Group admin added",
                      ["powers-groups"],
                    )
                  }
                >
                  {m.isAdmin ? "Remove admin" : "Make admin"}
                </ActionButton>
                <ActionButton
                  tone="danger"
                  onClick={() =>
                    setConfirm({
                      message: `Remove ${m.displayName} from the group?`,
                      act: () =>
                        action({
                          data: { action: "remove_member", groupId: group.id, userId: m.userId },
                        }),
                    })
                  }
                >
                  Remove
                </ActionButton>
              </div>
            ) : null}
          </div>
        ))}
      </div>

      {confirm ? (
        <Confirm
          message={confirm.message}
          busy={busy}
          onCancel={() => setConfirm(null)}
          onConfirm={() =>
            run(confirm.act, "Done", ["powers-groups"]).then((ok) => {
              setConfirm(null);
              if (ok) setGroupId(null);
            })
          }
        />
      ) : null}
    </div>
  );
}

/* ------------------------------- staff panel ------------------------------ */

const ROLE_OPTIONS = ["manager", "admin", "helper", "viewer"] as const;

function StaffPanel({
  can,
  assignable,
}: {
  can: (p: string) => boolean;
  assignable: readonly string[];
}) {
  const fetchStaff = useServerFn(powersStaff);
  const review = useServerFn(powersReviewApplication);
  const setRole = useServerFn(powersSetRole);
  const { busy, run } = useAction();
  const [approving, setApproving] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [roleFor, setRoleFor] = useState<string | null>(null);

  const staff = useQuery({
    queryKey: ["powers-staff"],
    queryFn: () => fetchStaff({ data: undefined as never }),
  });

  if (staff.isLoading) return <Empty text="Loading staff…" />;
  if (staff.isError) return <Empty text="Could not load staff." />;

  const pending = (staff.data?.applications ?? []).filter((a) => a.status === "pending");

  return (
    <div className="space-y-4">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Staff management</h2>

      {can("review_staff_applications") ? (
        <section className="space-y-2">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Pending applications
          </h3>
          {pending.length === 0 ? <Empty text="No pending applications." /> : null}
          {pending.map((a) => {
            const person = a.profiles as { display_name?: string; username?: string } | null;
            return (
              <Card key={a.id}>
                <p className="text-sm font-semibold">{person?.display_name ?? "User"}</p>
                <p className="text-xs text-muted-foreground">@{person?.username}</p>
                <p className="mt-2 text-xs text-foreground">{a.reason}</p>

                {approving === a.id ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {assignable.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        Your rank cannot assign any staff rank.
                      </p>
                    ) : null}
                    {assignable.map((r) => (
                      <ActionButton
                        key={r}
                        disabled={busy}
                        onClick={() =>
                          run(
                            () =>
                              review({
                                data: {
                                  id: a.id,
                                  status: "approved",
                                  role: r as (typeof ROLE_OPTIONS)[number],
                                },
                              }),
                            `Approved as ${r}`,
                            ["powers-staff"],
                          ).then(() => setApproving(null))
                        }
                      >
                        {r}
                      </ActionButton>
                    ))}
                    <ActionButton onClick={() => setApproving(null)}>Cancel</ActionButton>
                  </div>
                ) : rejecting === a.id ? (
                  <div className="mt-3 space-y-2">
                    <textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      rows={2}
                      placeholder="Reason for rejection"
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                    />
                    <div className="flex gap-2">
                      <ActionButton
                        tone="danger"
                        disabled={busy}
                        onClick={() =>
                          run(
                            () =>
                              review({
                                data: { id: a.id, status: "rejected", note: note.trim() || undefined },
                              }),
                            "Application rejected",
                            ["powers-staff"],
                          ).then(() => {
                            setRejecting(null);
                            setNote("");
                          })
                        }
                      >
                        Confirm reject
                      </ActionButton>
                      <ActionButton onClick={() => setRejecting(null)}>Cancel</ActionButton>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 flex gap-2">
                    <ActionButton onClick={() => setApproving(a.id)}>Approve</ActionButton>
                    <ActionButton tone="danger" onClick={() => setRejecting(a.id)}>
                      Reject
                    </ActionButton>
                  </div>
                )}
              </Card>
            );
          })}
        </section>
      ) : null}

      <section className="space-y-2">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Staff roster
        </h3>
        {(staff.data?.staff ?? []).length === 0 ? <Empty text="No staff members yet." /> : null}
        {(staff.data?.staff ?? []).map((s) => {
          const person = s.profiles as { display_name?: string; username?: string } | null;
          return (
            <Card key={`${s.user_id}-${s.role}`}>
              <p className="text-sm font-semibold">{person?.display_name ?? "User"}</p>
              <p className="text-xs text-muted-foreground">
                @{person?.username} · {s.role}
              </p>
              {can("assign_roles") ? (
                roleFor === s.user_id ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {assignable.map((r) => (
                      <ActionButton
                        key={r}
                        disabled={busy}
                        onClick={() =>
                          run(
                            () =>
                              setRole({
                                data: {
                                  userId: s.user_id,
                                  role: r as (typeof ROLE_OPTIONS)[number],
                                },
                              }),
                            `Rank changed to ${r}`,
                            ["powers-staff"],
                          ).then(() => setRoleFor(null))
                        }
                      >
                        {r}
                      </ActionButton>
                    ))}
                    <ActionButton
                      tone="danger"
                      disabled={busy}
                      onClick={() =>
                        run(
                          () => setRole({ data: { userId: s.user_id, role: "none" } }),
                          "Staff rank removed",
                          ["powers-staff"],
                        ).then(() => setRoleFor(null))
                      }
                    >
                      Remove rank
                    </ActionButton>
                    <ActionButton onClick={() => setRoleFor(null)}>Cancel</ActionButton>
                  </div>
                ) : (
                  <div className="mt-2">
                    <ActionButton onClick={() => setRoleFor(s.user_id)}>Change rank</ActionButton>
                  </div>
                )
              ) : null}
            </Card>
          );
        })}
      </section>
    </div>
  );
}

/* ------------------------------ reports panel ----------------------------- */

function ReportsPanel({ can }: { can: (p: string) => boolean }) {
  const fetchReports = useServerFn(powersReports);
  const update = useServerFn(powersUpdateReport);
  const { busy, run } = useAction();
  const [openId, setOpenId] = useState<string | null>(null);
  const [note, setNote] = useState("");

  const reports = useQuery({
    queryKey: ["powers-reports"],
    queryFn: () => fetchReports({ data: undefined as never }),
  });

  if (reports.isLoading) return <Empty text="Loading reports…" />;
  if (reports.isError) return <Empty text="Could not load reports." />;

  return (
    <div className="space-y-2">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Reports</h2>
      {(reports.data ?? []).length === 0 ? <Empty text="No reports." /> : null}
      {(reports.data ?? []).map((r) => (
        <Card key={r.id}>
          <p className="text-sm font-semibold">
            {(r.target as { display_name?: string } | null)?.display_name ?? "Reported content"}
          </p>
          <p className="text-xs text-muted-foreground">
            by {(r.reporter as { display_name?: string } | null)?.display_name ?? "Unknown"} · {r.status}
          </p>
          <p className="mt-2 text-xs text-foreground">{r.reason}</p>
          {r.action_note ? (
            <p className="mt-1 text-xs text-muted-foreground">Note: {r.action_note}</p>
          ) : null}

          {can("resolve_reports") ? (
            openId === r.id ? (
              <div className="mt-2 space-y-2">
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  placeholder="Resolution note (optional)"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                />
                <div className="flex flex-wrap gap-2">
                  {(["reviewing", "resolved", "dismissed"] as const).map((status) => (
                    <ActionButton
                      key={status}
                      disabled={busy}
                      onClick={() =>
                        run(
                          () =>
                            update({
                              data: { id: r.id, status, note: note.trim() || undefined },
                            }),
                          `Report ${status}`,
                          ["powers-reports"],
                        ).then(() => {
                          setOpenId(null);
                          setNote("");
                        })
                      }
                    >
                      {status}
                    </ActionButton>
                  ))}
                  <ActionButton onClick={() => setOpenId(null)}>Cancel</ActionButton>
                </div>
              </div>
            ) : (
              <div className="mt-2">
                <ActionButton onClick={() => setOpenId(r.id)}>Take action</ActionButton>
              </div>
            )
          ) : null}
        </Card>
      ))}
    </div>
  );
}

/* --------------------------- announcements panel -------------------------- */

function AnnouncementsPanel() {
  const list = useServerFn(powersAnnouncements);
  const action = useServerFn(powersAnnouncementAction);
  const { busy, run } = useAction();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const announcements = useQuery({
    queryKey: ["powers-announcements"],
    queryFn: () => list({ data: undefined as never }),
  });

  function reset() {
    setEditing(null);
    setTitle("");
    setBody("");
  }

  return (
    <div className="space-y-3">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Announcements</h2>
      <Card>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          placeholder="Message"
          className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
        />
        {title.trim() && body.trim() ? (
          <div className="mt-2 rounded-xl border border-dashed border-border p-2">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Preview</p>
            <p className="mt-1 text-sm font-semibold">{title}</p>
            <p className="text-xs text-muted-foreground">{body}</p>
          </div>
        ) : null}
        <div className="mt-2 flex gap-2">
          <ActionButton
            disabled={busy || title.trim().length < 2 || body.trim().length < 2}
            onClick={() =>
              run(
                () =>
                  action({
                    data: {
                      action: editing ? "update" : "create",
                      id: editing ?? undefined,
                      title: title.trim(),
                      body: body.trim(),
                    },
                  }),
                editing ? "Announcement updated" : "Announcement published",
                ["powers-announcements"],
              ).then((ok) => ok && reset())
            }
          >
            {editing ? "Save changes" : "Publish"}
          </ActionButton>
          {editing ? <ActionButton onClick={reset}>Cancel</ActionButton> : null}
        </div>
      </Card>

      {announcements.isLoading ? <Empty text="Loading announcements…" /> : null}
      {(announcements.data ?? []).map((a) => (
        <Card key={a.id}>
          <p className="text-sm font-semibold">{a.title}</p>
          <p className="text-xs text-muted-foreground">{a.body}</p>
          <div className="mt-2 flex gap-2">
            <ActionButton
              onClick={() => {
                setEditing(a.id);
                setTitle(a.title);
                setBody(a.body);
              }}
            >
              Edit
            </ActionButton>
            <ActionButton tone="danger" onClick={() => setConfirmId(a.id)}>
              Delete
            </ActionButton>
          </div>
        </Card>
      ))}

      {confirmId ? (
        <Confirm
          message="Delete this announcement?"
          busy={busy}
          onCancel={() => setConfirmId(null)}
          onConfirm={() =>
            run(
              () => action({ data: { action: "delete", id: confirmId } }),
              "Announcement deleted",
              ["powers-announcements"],
            ).then(() => setConfirmId(null))
          }
        />
      ) : null}
    </div>
  );
}

/* ----------------------------- analytics panel ---------------------------- */

function AnalyticsPanel() {
  const fetchAnalytics = useServerFn(powersAnalytics);
  const analytics = useQuery({
    queryKey: ["powers-analytics"],
    queryFn: () => fetchAnalytics({ data: undefined as never }),
  });

  if (analytics.isLoading) return <Empty text="Loading analytics…" />;
  if (analytics.isError) return <Empty text="Could not load analytics." />;
  const a = analytics.data!;

  const stats = [
    { label: "Users", value: a.users },
    { label: "Direct chats", value: a.directChats },
    { label: "Groups", value: a.groups },
    { label: "Messages", value: a.messages },
    { label: "Messages (24h)", value: a.messages24h },
    { label: "Open reports", value: a.openReports },
    { label: "Pending applications", value: a.pendingApplications },
  ];

  return (
    <div className="space-y-3">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Analytics</h2>
      <div className="grid grid-cols-2 gap-2">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-border/70 bg-card p-3">
            <p className="text-lg font-bold text-foreground">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>
      <Card>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Staff by rank</p>
        <div className="mt-2 space-y-1">
          {Object.entries(a.staffByRole).length === 0 ? (
            <p className="text-xs text-muted-foreground">No staff assigned.</p>
          ) : null}
          {Object.entries(a.staffByRole).map(([role, count]) => (
            <p key={role} className="text-xs text-foreground">
              {role}: <span className="font-semibold">{count}</span>
            </p>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* ------------------------------ activity panel ---------------------------- */

function ActivityPanel() {
  const fetchLogs = useServerFn(powersActivityLogs);
  const logs = useQuery({
    queryKey: ["powers-activity"],
    queryFn: () => fetchLogs({ data: undefined as never }),
  });

  if (logs.isLoading) return <Empty text="Loading activity…" />;
  if (logs.isError) return <Empty text="Could not load activity logs." />;

  return (
    <div className="space-y-2">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Activity logs</h2>
      {(logs.data ?? []).length === 0 ? <Empty text="No staff activity recorded yet." /> : null}
      {(logs.data ?? []).map((l) => (
        <div key={l.id} className="rounded-2xl border border-border/70 bg-card p-3">
          <p className="text-sm font-semibold">{l.action}</p>
          <p className="text-xs text-muted-foreground">
            {l.actor?.display_name ?? "System"}
            {l.actor_role ? ` (${l.actor_role})` : ""} · {new Date(l.created_at).toLocaleString()}
          </p>
          {l.target_label ? (
            <p className="text-xs text-muted-foreground">Target: {l.target_label}</p>
          ) : null}
          {l.detail ? <p className="text-xs text-muted-foreground">{l.detail}</p> : null}
          <p
            className={`mt-1 text-[10px] font-semibold uppercase tracking-wide ${
              l.result === "success" ? "text-muted-foreground" : "text-destructive"
            }`}
          >
            {l.result}
          </p>
        </div>
      ))}
    </div>
  );
}
