import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { useAccount } from "@/hooks/useAccount";
import { findOrCreateDirectChat, loadProfile } from "@/lib/chat-client";
import { ProfileAvatar } from "@/components/profile-avatar";

export const Route = createFileRoute("/_authenticated/u/$userId")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "User profile — BharatChat" },
      { name: "description", content: "View a BharatChat member's profile and start a conversation." },
      { property: "og:title", content: "User profile — BharatChat" },
      { property: "og:description", content: "View a BharatChat member's profile." },
    ],
  }),
  component: UserPreviewPage,
});

function UserPreviewPage() {
  const { userId: otherId } = Route.useParams();
  const { userId } = useAccount();
  const navigate = useNavigate();
  const [starting, setStarting] = useState(false);

  const { data: profile, isLoading, error } = useQuery({
    queryKey: ["profile", otherId],
    queryFn: () => loadProfile(otherId),
  });

  async function startChat() {
    if (!userId) return;
    setStarting(true);
    try {
      const chatId = await findOrCreateDirectChat(userId, otherId);
      navigate({ to: "/c/$chatId", params: { chatId } });
    } catch (err) {
      console.error("startChat failed", err);
      toast.error(err instanceof Error ? err.message : "Could not create conversation.");
    } finally {
      setStarting(false);
    }
  }

  return (
    <AppShell>
      <button
        onClick={() => navigate({ to: "/new" })}
        className="mb-4 flex items-center gap-1 text-sm text-muted-foreground"
      >
        <ArrowLeft className="size-4" /> Back
      </button>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading profile…</p>
      ) : error || !profile ? (
        <p className="text-sm text-destructive">Unable to open this user. Please try again.</p>
      ) : (
        <div className="rounded-3xl border border-border bg-card p-6 text-center shadow-soft">
          <ProfileAvatar src={profile.avatar_url} name={profile.display_name} className="mx-auto size-20" textClassName="text-2xl" />
          <h1 className="mt-4 text-lg font-bold">{profile.display_name}</h1>
          <p className="text-sm text-muted-foreground">@{profile.username}</p>
          {profile.bio ? <p className="mt-3 text-sm">{profile.bio}</p> : null}
          <p className="mt-2 text-xs uppercase tracking-wider text-muted-foreground">
            Account {profile.status}
          </p>

          <button
            type="button"
            onClick={startChat}
            disabled={starting || !userId}
            className="brand-gradient mt-6 flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold tracking-wide text-primary-foreground disabled:opacity-60"
          >
            <MessageCircle className="size-4" />
            {starting ? "OPENING…" : "START CHAT"}
          </button>
        </div>
      )}
    </AppShell>
  );
}