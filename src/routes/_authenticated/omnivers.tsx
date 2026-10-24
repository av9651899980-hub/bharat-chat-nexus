import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { useAccount } from "@/hooks/useAccount";
import {
  verifyGodKey,
  jarvisOverview,
  jarvisUsers,
  jarvisSetUserStatus,
  jarvisChats,
  jarvisChatMessages,
  jarvisGroups,
  jarvisGroupAction,
  jarvisStaff,
  jarvisReviewApplication,
  jarvisSetRole,
  jarvisReports,
  jarvisUpdateReport,
  jarvisAnnouncements,
  jarvisAnnounce,
} from "@/lib/jarvis.functions";
import {
  jarvisStaffPermissionDetail,
  jarvisSetUserPermission,
  jarvisResetUserPermissions,
} from "@/lib/permissions.functions";

export const Route = createFileRoute("/_authenticated/omnivers")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "JARVIS OMNIVERS — BharatChat" },
      { name: "description", content: "Owner-only command centre for BharatChat oversight and moderation." },
      { property: "og:title", content: "JARVIS OMNIVERS" },
      { property: "og:description", content: "Owner-only command centre for BharatChat." },
    ],
  }),
  component: OmniversPage,
});

const TABS = ["Overview", "Users", "Chats", "Groups", "Staff", "Reports", "Broadcast"] as const;
type Tab = (typeof TABS)[number];

function OmniversPage() {
  const { data, isLoading } = useAccount();
  const navigate = useNavigate();
  const verify = useServerFn(verifyGodKey);
  const [unlocked, setUnlocked] = useState(false);
  const [key, setKey] = useState("");
  const [tab, setTab] = useState<Tab>("Overview");

  if (isLoading) return <JarvisFrame>Initialising…</JarvisFrame>;

  if (!data?.isJarvis) {
    return (
      <JarvisFrame>
        <p className="text-sm">Access denied.</p>
        <button onClick={() => navigate({ to: "/chats" })} className="mt-4 text-xs underline">
          Return to BharatChat
        </button>
      </JarvisFrame>
    );
  }

  if (!unlocked) {
    return (
      <JarvisFrame>
        <p className="mb-3 text-sm tracking-[0.3em]">GOD KEY REQUIRED</p>
        <input
          value={key}
          onChange={(e) => setKey(e.target.value)}
          type="password"
          inputMode="numeric"
          placeholder="••••••"
          className="w-full rounded-xl border border-jarvis/50 bg-black/30 px-4 py-3 text-center text-lg tracking-[0.5em] text-jarvis outline-none"
        />
        <button
          onClick={async () => {
            try {
              await verify({ data: { key } });
              setUnlocked(true);
            } catch {
              toast.error("Verification failed");
            }
          }}
          className="mt-3 w-full rounded-xl border border-jarvis/60 bg-jarvis/10 px-4 py-3 text-sm font-semibold tracking-[0.2em] text-jarvis shadow-jarvis"
        >
          UNLOCK
        </button>
      </JarvisFrame>
    );
  }

  return (
    <JarvisFrame wide>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-bold tracking-[0.3em] text-jarvis animate-rise">JARVIS OMNIVERS</h1>
        <button onClick={() => navigate({ to: "/chats" })} className="text-xs text-jarvis/70 underline">
          Exit
        </button>
      </div>
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold ${
              tab === t ? "border-jarvis bg-jarvis/15 text-jarvis" : "border-jarvis/25 text-jarvis/60"
            }`}
          >
            {t}
          </button>
        ))}
      </div>
      {tab === "Overview" ? <OverviewTab /> : null}
      {tab === "Users" ? <UsersTab /> : null}
      {tab === "Chats" ? <ChatsTab /> : null}
      {tab === "Groups" ? <GroupsTab /> : null}
      {tab === "Staff" ? <StaffTab /> : null}
      {tab === "Reports" ? <ReportsTab /> : null}
      {tab === "Broadcast" ? <BroadcastTab /> : null}
    </JarvisFrame>
  );
}

function JarvisFrame({ children, wide }: { children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="dark min-h-screen bg-background px-4 py-8 text-jarvis">
      <div className={`mx-auto w-full ${wide ? "max-w-2xl" : "max-w-sm text-center"}`}>{children}</div>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-2 rounded-2xl border border-jarvis/25 bg-card/70 p-3 text-sm text-foreground">{children}</div>
  );
}

function OverviewTab() {
  const fn = useServerFn(jarvisOverview);
  const { data } = useQuery({ queryKey: ["jarvis-overview"], queryFn: () => fn({ data: undefined }) });
  const stats = [
    ["Users", data?.users],
    ["Direct chats", data?.chats],
    ["Groups", data?.groups],
    ["Messages", data?.messages],
    ["Open reports", data?.openReports],
    ["Pending staff", data?.pendingApplications],
  ] as const;

  return (
    <div className="grid grid-cols-2 gap-2">
      {stats.map(([label, value]) => (
        <div key={label} className="rounded-2xl border border-jarvis/25 bg-card/70 p-3">
          <p className="text-[10px] uppercase tracking-widest text-jarvis/70">{label}</p>
          <p className="text-2xl font-bold text-foreground">{value ?? "—"}</p>
        </div>
      ))}
      <div className="col-span-2 rounded-2xl border border-jarvis/25 bg-card/70 p-3 text-xs">
        Database: {data?.databaseOnline ? "online" : "unreachable"}
      </div>
    </div>
  );
}

function UsersTab() {
  const list = useServerFn(jarvisUsers);
  const setStatus = useServerFn(jarvisSetUserStatus);
  const queryClient = useQueryClient();
  const { data } = useQuery({ queryKey: ["jarvis-users"], queryFn: () => list({ data: undefined }) });
  const [term, setTerm] = useState("");

  const filtered = (data ?? []).filter(
    (u) =>
      !term.trim() ||
      u.username.toLowerCase().includes(term.toLowerCase()) ||
      u.display_name.toLowerCase().includes(term.toLowerCase()),
  );

  return (
    <>
      <input
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        placeholder="Search users"
        className="mb-3 w-full rounded-xl border border-jarvis/30 bg-black/20 px-3 py-2 text-sm text-foreground outline-none"
      />
      {filtered.map((u) => (
        <Card key={u.id}>
          <p className="font-semibold">
            {u.display_name} <span className="text-xs text-muted-foreground">@{u.username}</span>
          </p>
          <p className="text-xs text-muted-foreground">
            {u.mobile ?? "no mobile"} · {u.status} · roles: {u.roles.join(", ") || "none"}
          </p>
          <p className="text-xs text-muted-foreground">Groups: {u.groups.join(", ") || "none"}</p>
          <div className="mt-2 flex gap-2">
            {(["active", "restricted", "suspended"] as const).map((s) => (
              <button
                key={s}
                onClick={async () => {
                  await setStatus({ data: { userId: u.id, status: s } });
                  queryClient.invalidateQueries({ queryKey: ["jarvis-users"] });
                  toast.success(`Account ${s}`);
                }}
                className="rounded-lg border border-jarvis/30 px-2 py-1 text-[11px] text-jarvis"
              >
                {s}
              </button>
            ))}
          </div>
        </Card>
      ))}
    </>
  );
}

function ChatsTab() {
  const list = useServerFn(jarvisChats);
  const readMessages = useServerFn(jarvisChatMessages);
  const { data } = useQuery({ queryKey: ["jarvis-chats"], queryFn: () => list({ data: undefined }) });
  const [open, setOpen] = useState<string | null>(null);
  const { data: messages } = useQuery({
    queryKey: ["jarvis-chat-messages", open],
    enabled: !!open,
    queryFn: () => readMessages({ data: { chatId: open! } }),
  });

  return (
    <>
      {(data ?? []).map((c) => (
        <Card key={c.id}>
          <button className="w-full text-left" onClick={() => setOpen(open === c.id ? null : c.id)}>
            <p className="font-semibold">{c.participants.join(" ↔ ")}</p>
            <p className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleString()}</p>
          </button>
          {open === c.id ? (
            <div className="mt-2 max-h-64 space-y-1 overflow-y-auto rounded-xl bg-black/20 p-2">
              {(messages ?? []).map((m) => (
                <p key={m.id} className="text-xs">
                  <span className="text-jarvis">
                    {(m.profiles as { display_name?: string } | null)?.display_name ?? "Unknown"}:
                  </span>{" "}
                  {m.deleted_at ? <i>deleted</i> : m.kind === "voice" ? "[voice message]" : m.content}
                  {m.edited_at ? <i className="text-muted-foreground"> (edited)</i> : null}
                </p>
              ))}
            </div>
          ) : null}
        </Card>
      ))}
    </>
  );
}

function GroupsTab() {
  const list = useServerFn(jarvisGroups);
  const act = useServerFn(jarvisGroupAction);
  const queryClient = useQueryClient();
  const { data } = useQuery({ queryKey: ["jarvis-groups"], queryFn: () => list({ data: undefined }) });

  async function run(input: {
    action: "add_member" | "remove_member" | "promote" | "demote" | "update" | "delete";
    groupId: string;
    userId?: string;
    name?: string;
    description?: string;
    onlyAdminsSend?: boolean;
  }) {
    await act({ data: input });
    queryClient.invalidateQueries({ queryKey: ["jarvis-groups"] });
  }

  return (
    <>
      {(data ?? []).map((g) => (
        <Card key={g.id}>
          <p className="font-semibold">{g.name}</p>
          <p className="text-xs text-muted-foreground">{g.description ?? "No description"}</p>
          <ul className="mt-2 space-y-1">
            {g.members.map((m) => (
              <li key={m.userId} className="flex items-center justify-between text-xs">
                <span>
                  {m.displayName} {m.isAdmin ? <b className="text-jarvis">ADMIN</b> : null}
                </span>
                <span className="flex gap-2">
                  <button
                    className="text-jarvis"
                    onClick={() =>
                      run({ action: m.isAdmin ? "demote" : "promote", groupId: g.id, userId: m.userId })
                    }
                  >
                    {m.isAdmin ? "Demote" : "Promote"}
                  </button>
                  <button
                    className="text-destructive"
                    onClick={() => run({ action: "remove_member", groupId: g.id, userId: m.userId })}
                  >
                    Remove
                  </button>
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-2 flex gap-2">
            <button
              className="rounded-lg border border-jarvis/30 px-2 py-1 text-[11px]"
              onClick={() => run({ action: "update", groupId: g.id, onlyAdminsSend: !g.only_admins_send })}
            >
              {g.only_admins_send ? "Allow all to send" : "Only admins send"}
            </button>
            <button
              className="rounded-lg border border-destructive/50 px-2 py-1 text-[11px] text-destructive"
              onClick={() => run({ action: "delete", groupId: g.id })}
            >
              Delete group
            </button>
          </div>
        </Card>
      ))}
    </>
  );
}

function StaffTab() {
  const list = useServerFn(jarvisStaff);
  const review = useServerFn(jarvisReviewApplication);
  const setRole = useServerFn(jarvisSetRole);
  const queryClient = useQueryClient();
  const { data } = useQuery({ queryKey: ["jarvis-staff"], queryFn: () => list({ data: undefined }) });
  const [approving, setApproving] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [pickedRole, setPickedRole] = useState<"viewer" | "helper" | "admin" | "manager">("viewer");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [managing, setManaging] = useState<string | null>(null);

  async function submitReview(id: string, status: "approved" | "rejected") {
    setBusy(true);
    try {
      await review({
        data: {
          id,
          status,
          ...(status === "approved" ? { role: pickedRole } : {}),
          ...(status === "rejected" && note.trim() ? { note: note.trim().slice(0, 300) } : {}),
        },
      });
      setApproving(null);
      setRejecting(null);
      setNote("");
      setPickedRole("viewer");
      await queryClient.invalidateQueries({ queryKey: ["jarvis-staff"] });
      await queryClient.invalidateQueries({ queryKey: ["jarvis-overview"] });
      toast.success(status === "approved" ? "Application approved" : "Application rejected");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Review failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <p className="mb-2 text-xs uppercase tracking-widest text-jarvis/70">Applications</p>
      {(data?.applications ?? []).length === 0 ? (
        <Card>No staff applications yet.</Card>
      ) : null}
      {(data?.applications ?? []).map((a) => (
        <Card key={a.id}>
          <p className="font-semibold">
            {(a.profiles as { display_name?: string } | null)?.display_name ?? "Unknown"}{" "}
            <span className="text-xs text-muted-foreground">
              @{(a.profiles as { username?: string } | null)?.username ?? "unknown"}
            </span>{" "}
            — {a.status}
          </p>
          <p className="text-[11px] text-muted-foreground">{new Date(a.created_at).toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">{a.reason}</p>
          {a.status === "pending" ? (
            <div className="mt-2">
              {approving === a.id ? (
                <div className="rounded-xl border border-jarvis/30 p-2">
                  <p className="mb-2 text-[11px] uppercase tracking-widest text-jarvis/70">Select staff role</p>
                  <div className="flex flex-wrap gap-2">
                    {(["viewer", "helper", "admin", "manager"] as const).map((r) => (
                      <button
                        key={r}
                        onClick={() => setPickedRole(r)}
                        className={`rounded-lg border px-2 py-1 text-[11px] uppercase ${
                          pickedRole === r
                            ? "border-jarvis bg-jarvis/15 text-jarvis"
                            : "border-jarvis/30 text-jarvis/70"
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                  <div className="mt-2 flex gap-2">
                    <button
                      disabled={busy}
                      onClick={() => submitReview(a.id, "approved")}
                      className="rounded-lg border border-jarvis/60 bg-jarvis/10 px-2 py-1 text-[11px] font-semibold tracking-widest text-jarvis disabled:opacity-60"
                    >
                      {busy ? "CONFIRMING…" : "CONFIRM APPROVAL"}
                    </button>
                    <button
                      onClick={() => setApproving(null)}
                      className="rounded-lg border border-jarvis/30 px-2 py-1 text-[11px] text-jarvis/70"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : rejecting === a.id ? (
                <div className="rounded-xl border border-destructive/40 p-2">
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={2}
                    placeholder="Rejection reason (optional)"
                    className="w-full rounded-lg border border-jarvis/30 bg-black/20 px-2 py-1 text-xs text-foreground outline-none"
                  />
                  <div className="mt-2 flex gap-2">
                    <button
                      disabled={busy}
                      onClick={() => submitReview(a.id, "rejected")}
                      className="rounded-lg border border-destructive/60 px-2 py-1 text-[11px] font-semibold text-destructive disabled:opacity-60"
                    >
                      {busy ? "REJECTING…" : "CONFIRM REJECTION"}
                    </button>
                    <button
                      onClick={() => {
                        setRejecting(null);
                        setNote("");
                      }}
                      className="rounded-lg border border-jarvis/30 px-2 py-1 text-[11px] text-jarvis/70"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setRejecting(null);
                      setApproving(a.id);
                    }}
                    className="rounded-lg border border-jarvis/40 px-2 py-1 text-[11px] font-semibold tracking-widest text-jarvis"
                  >
                    APPROVE
                  </button>
                  <button
                    onClick={() => {
                      setApproving(null);
                      setRejecting(a.id);
                    }}
                    className="rounded-lg border border-destructive/50 px-2 py-1 text-[11px] font-semibold tracking-widest text-destructive"
                  >
                    REJECT
                  </button>
                </div>
              )}
            </div>
          ) : null}
          {a.status !== "pending" ? (
            <p className="mt-1 text-[11px] text-muted-foreground">
              Reviewed{a.review_note ? ` — ${a.review_note}` : ""}
            </p>
          ) : null}
        </Card>
      ))}

      <p className="mb-2 mt-4 text-xs uppercase tracking-widest text-jarvis/70">Staff roles</p>
      {(data?.staff ?? []).map((s, i) => (
        <Card key={i}>
          <p className="font-semibold">
            {(s.profiles as { display_name?: string } | null)?.display_name ?? "Unknown"} — {s.role}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {(["manager", "admin", "helper", "viewer", "none"] as const).map((role) => (
              <button
                key={role}
                onClick={async () => {
                  try {
                    await setRole({ data: { userId: s.user_id, role } });
                    queryClient.invalidateQueries({ queryKey: ["jarvis-staff"] });
                  } catch {
                    toast.error("Could not update the role");
                  }
                }}
                className="rounded-lg border border-jarvis/30 px-2 py-1 text-[11px] text-jarvis"
              >
                {role}
              </button>
            ))}
          </div>
          <button
            onClick={() => setManaging(managing === s.user_id ? null : s.user_id)}
            className="mt-2 w-full rounded-lg border border-jarvis/50 bg-jarvis/10 px-2 py-1.5 text-[11px] font-semibold tracking-widest text-jarvis transition-colors hover:bg-jarvis/20"
          >
            {managing === s.user_id ? "CLOSE PERMISSIONS" : "MANAGE PERMISSIONS"}
          </button>
          {managing === s.user_id ? <PermissionEditor userId={s.user_id} /> : null}
        </Card>
      ))}
    </>
  );
}

function PermissionEditor({ userId }: { userId: string }) {
  const detailFn = useServerFn(jarvisStaffPermissionDetail);
  const setPermission = useServerFn(jarvisSetUserPermission);
  const resetPermissions = useServerFn(jarvisResetUserPermissions);
  const queryClient = useQueryClient();
  const [pending, setPending] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["jarvis-permission-detail", userId],
    queryFn: () => detailFn({ data: { userId } }),
  });

  async function apply(permission: string, mode: "grant" | "deny" | "inherit") {
    setPending(permission + mode);
    try {
      await setPermission({ data: { userId, permission, mode } });
      await queryClient.invalidateQueries({ queryKey: ["jarvis-permission-detail", userId] });
      toast.success(
        mode === "grant" ? "Permission granted" : mode === "deny" ? "Permission revoked" : "Reset to default",
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update the permission");
    } finally {
      setPending(null);
    }
  }

  if (isLoading) return <p className="mt-2 text-[11px] text-jarvis/60">Loading permissions…</p>;
  if (error)
    return (
      <p className="mt-2 text-[11px] text-destructive">
        {error instanceof Error ? error.message : "Could not load permissions"}
      </p>
    );
  if (!data) return null;

  const categories = [...new Set(data.permissions.map((p) => p.category))];
  const overrideOf = (key: string) => data.overrides.find((o) => o.permission === key) ?? null;

  return (
    <div className="mt-3 space-y-3 rounded-2xl border border-jarvis/25 bg-black/20 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] uppercase tracking-widest text-jarvis/70">
          Rank {data.role ?? "none"} · {data.effective.length} active
        </p>
        <button
          onClick={async () => {
            try {
              await resetPermissions({ data: { userId } });
              await queryClient.invalidateQueries({ queryKey: ["jarvis-permission-detail", userId] });
              toast.success("Reset to rank defaults");
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Reset failed");
            }
          }}
          className="rounded-lg border border-jarvis/40 px-2 py-1 text-[10px] font-semibold tracking-widest text-jarvis"
        >
          RESET TO DEFAULTS
        </button>
      </div>

      {categories.map((category) => (
        <div key={category} className="space-y-1.5">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-jarvis/50">{category}</p>
          {data.permissions
            .filter((p) => p.category === category)
            .map((p) => {
              const override = overrideOf(p.key);
              const active = data.effective.includes(p.key);
              return (
                <div
                  key={p.key}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-jarvis/20 bg-card/50 px-2.5 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-foreground">{p.label}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {override
                        ? override.granted
                          ? "custom grant"
                          : "custom revoke"
                        : data.roleDefaults.includes(p.key)
                          ? "rank default"
                          : "not in rank"}
                      {active ? " · active" : ""}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    {(["grant", "deny", "inherit"] as const).map((mode) => {
                      const selected =
                        mode === "inherit" ? !override : override?.granted === (mode === "grant");
                      return (
                        <button
                          key={mode}
                          disabled={pending === p.key + mode}
                          onClick={() => apply(p.key, mode)}
                          className={`rounded-lg border px-2 py-1 text-[10px] font-semibold uppercase transition-colors disabled:opacity-50 ${
                            selected
                              ? "border-jarvis bg-jarvis/15 text-jarvis"
                              : "border-jarvis/25 text-jarvis/60 hover:border-jarvis/50"
                          }`}
                        >
                          {mode === "inherit" ? "default" : mode}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
        </div>
      ))}
    </div>
  );
}

function ReportsTab() {
  const list = useServerFn(jarvisReports);
  const update = useServerFn(jarvisUpdateReport);
  const queryClient = useQueryClient();
  const { data } = useQuery({ queryKey: ["jarvis-reports"], queryFn: () => list({ data: undefined }) });

  return (
    <>
      {(data ?? []).map((r) => (
        <Card key={r.id}>
          <p className="font-semibold">
            {(r.reporter as { display_name?: string } | null)?.display_name ?? "Unknown"} →{" "}
            {(r.target as { display_name?: string } | null)?.display_name ?? "group/chat"}
          </p>
          <p className="text-xs text-muted-foreground">{r.reason}</p>
          <div className="mt-2 flex gap-2">
            {(["reviewing", "resolved", "dismissed"] as const).map((s) => (
              <button
                key={s}
                onClick={async () => {
                  await update({ data: { id: r.id, status: s } });
                  queryClient.invalidateQueries({ queryKey: ["jarvis-reports"] });
                }}
                className={`rounded-lg border px-2 py-1 text-[11px] ${
                  r.status === s ? "border-jarvis bg-jarvis/15 text-jarvis" : "border-jarvis/30 text-jarvis/70"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </Card>
      ))}
    </>
  );
}

function BroadcastTab() {
  const list = useServerFn(jarvisAnnouncements);
  const announce = useServerFn(jarvisAnnounce);
  const queryClient = useQueryClient();
  const { data } = useQuery({ queryKey: ["jarvis-announcements"], queryFn: () => list({ data: undefined }) });
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  return (
    <>
      <div className="mb-4 space-y-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Announcement title"
          className="w-full rounded-xl border border-jarvis/30 bg-black/20 px-3 py-2 text-sm text-foreground outline-none"
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          placeholder="Message to every BharatChat user"
          className="w-full rounded-xl border border-jarvis/30 bg-black/20 px-3 py-2 text-sm text-foreground outline-none"
        />
        <button
          onClick={async () => {
            try {
              await announce({ data: { title, body } });
              setTitle("");
              setBody("");
              queryClient.invalidateQueries({ queryKey: ["jarvis-announcements"] });
              toast.success("Broadcast sent");
            } catch {
              toast.error("Could not send the broadcast");
            }
          }}
          className="w-full rounded-xl border border-jarvis/60 bg-jarvis/10 px-4 py-2.5 text-sm font-semibold tracking-widest text-jarvis shadow-jarvis"
        >
          BROADCAST
        </button>
      </div>
      {(data ?? []).map((a) => (
        <Card key={a.id}>
          <p className="font-semibold">{a.title}</p>
          <p className="text-xs text-muted-foreground">{a.body}</p>
        </Card>
      ))}
    </>
  );
}
