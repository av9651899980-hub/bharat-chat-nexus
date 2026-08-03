import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { RoleBadge } from "@/components/role-badge";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/hooks/useAccount";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Your profile — BharatChat" },
      { name: "description", content: "Update your BharatChat profile, apply for staff and manage your account." },
      { property: "og:title", content: "Your profile — BharatChat" },
      { property: "og:description", content: "Manage your BharatChat identity and staff application." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { userId, data } = useAccount();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const profile = data?.profile as
    | { display_name: string; username: string; mobile: string | null; bio: string | null }
    | null
    | undefined;

  const { data: application } = useQuery({
    queryKey: ["my-application", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data: app } = await supabase
        .from("staff_applications")
        .select("*")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return app;
    },
  });

  async function save() {
    if (!userId) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        ...(displayName.trim() ? { display_name: displayName.trim().slice(0, 60) } : {}),
        bio: bio.trim().slice(0, 200),
      })
      .eq("id", userId);
    setSaving(false);
    if (error) {
      toast.error("Could not save your profile");
      return;
    }
    setDisplayName("");
    toast.success("Profile updated");
    queryClient.invalidateQueries({ queryKey: ["account", userId] });
  }

  async function apply() {
    if (!userId || reason.trim().length < 10) {
      toast.error("Tell us a bit more (at least 10 characters)");
      return;
    }
    const { error } = await supabase
      .from("staff_applications")
      .insert({ user_id: userId, reason: reason.trim().slice(0, 500) });
    if (error) {
      toast.error("Could not submit your application");
      return;
    }
    setReason("");
    toast.success("Application sent to JARVIS");
    queryClient.invalidateQueries({ queryKey: ["my-application", userId] });
  }

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  }

  return (
    <AppShell title="Profile">
      <section className="rounded-2xl border border-border bg-card p-4 shadow-soft">
        <h1 className="text-xl font-bold">
          {profile?.display_name ?? "Your profile"}
          <RoleBadge role={data?.role ?? null} />
        </h1>
        <p className="text-sm text-muted-foreground">@{profile?.username}</p>
        {profile?.mobile ? <p className="text-xs text-muted-foreground">{profile.mobile}</p> : null}
        {profile?.bio ? <p className="mt-2 text-sm">{profile.bio}</p> : null}
      </section>

      <section className="mt-4 space-y-2 rounded-2xl border border-border bg-card p-4 shadow-soft">
        <p className="text-sm font-semibold">Edit profile</p>
        <input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder={profile?.display_name ?? "Display name"}
          className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring"
        />
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder={profile?.bio ?? "About you"}
          rows={3}
          className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring"
        />
        <button
          onClick={save}
          disabled={saving}
          className="brand-gradient w-full rounded-xl px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save changes"}
        </button>
      </section>

      <section className="mt-4 space-y-2 rounded-2xl border border-border bg-card p-4 shadow-soft">
        <p className="text-sm font-semibold">Staff application</p>
        {application ? (
          <p className="text-sm text-muted-foreground">
            Status: <span className="font-semibold text-foreground">{application.status}</span>
            {application.review_note ? ` — ${application.review_note}` : ""}
          </p>
        ) : (
          <>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="Why do you want to join the BharatChat staff team?"
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring"
            />
            <button
              onClick={apply}
              className="w-full rounded-xl bg-secondary px-4 py-2.5 text-sm font-semibold text-secondary-foreground"
            >
              Apply for staff
            </button>
          </>
        )}
      </section>

      <div className="mt-4 flex flex-col gap-2">
        <Link to="/privacy" className="text-center text-xs text-muted-foreground underline">
          Privacy & administrative transparency
        </Link>
        <button onClick={signOut} className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-destructive">
          Sign out
        </button>
      </div>
    </AppShell>
  );
}