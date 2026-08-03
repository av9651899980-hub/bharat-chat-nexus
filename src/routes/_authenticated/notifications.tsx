import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { AppShell } from "@/components/app-shell";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/hooks/useAccount";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — BharatChat" },
      { name: "description", content: "Messages, staff updates and JARVIS announcements in one place." },
      { property: "og:title", content: "Notifications — BharatChat" },
      { property: "og:description", content: "Your BharatChat alerts and announcements." },
    ],
  }),
  component: NotificationsPage,
});

function NotificationsPage() {
  const { userId } = useAccount();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: items } = useQuery({
    queryKey: ["notifications", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false })
        .limit(100);
      return data ?? [];
    },
  });

  useEffect(() => {
    if (!userId || !items?.length) return;
    supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", userId)
      .eq("is_read", false)
      .then(() => queryClient.invalidateQueries({ queryKey: ["unread-notifications", userId] }));
  }, [userId, items, queryClient]);

  return (
    <AppShell title="Notifications">
      <h1 className="mb-3 text-xl font-bold">Notifications</h1>
      {!items?.length ? (
        <p className="text-sm text-muted-foreground">Nothing here yet.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((n) => (
            <li key={n.id}>
              <button
                onClick={() => {
                  const chatId = n.link?.startsWith("/c/") ? n.link.slice(3) : null;
                  if (chatId) navigate({ to: "/c/$chatId", params: { chatId } });
                }}
                className="w-full rounded-2xl border border-border bg-card p-3 text-left shadow-soft"
              >
                <p className="text-sm font-semibold">{n.title}</p>
                {n.body ? <p className="mt-0.5 text-xs text-muted-foreground">{n.body}</p> : null}
                <p className="mt-1 text-[10px] text-muted-foreground">
                  {new Date(n.created_at).toLocaleString()}
                </p>
              </button>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}