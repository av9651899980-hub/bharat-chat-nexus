import { Link, useNavigate } from "@tanstack/react-router";
import { Bell, MessageCircle, Users, User } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/hooks/useAccount";

function JarvisMark() {
  return (
    <Link
      to="/omnivers"
      aria-label="JARVIS"
      className="rounded-full border border-jarvis/60 bg-jarvis/10 px-3 py-1 text-[11px] font-semibold tracking-[0.2em] text-jarvis shadow-jarvis"
    >
      JARVIS
    </Link>
  );
}

export function AppShell({
  children,
  title = "BharatChat",
  showNav = true,
}: {
  children: ReactNode;
  title?: string;
  showNav?: boolean;
}) {
  const { userId, data } = useAccount();
  const navigate = useNavigate();

  const { data: unread } = useQuery({
    queryKey: ["unread-notifications", userId],
    enabled: !!userId,
    refetchInterval: 20000,
    queryFn: async () => {
      const { count } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId!)
        .eq("is_read", false);
      return count ?? 0;
    },
  });

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-20 border-b border-border/70 bg-background/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-xl items-center justify-between px-4 py-3">
          <button
            onClick={() => navigate({ to: "/chats" })}
            className="text-lg font-bold tracking-tight text-primary"
          >
            {title}
          </button>
          <div className="flex items-center gap-3">
            {data?.isJarvis ? <JarvisMark /> : null}
            <Link to="/notifications" aria-label="Notifications" className="relative p-1">
              <Bell className="size-5 text-foreground" />
              {unread ? (
                <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-accent text-[9px] font-bold text-accent-foreground">
                  {unread > 9 ? "9+" : unread}
                </span>
              ) : null}
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-xl flex-1 px-4 pb-28 pt-4">{children}</main>

      {showNav ? (
        <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-border/70 bg-background/95 backdrop-blur">
          <div className="mx-auto grid w-full max-w-xl grid-cols-3">
            {[
              { to: "/chats", label: "Chats", icon: MessageCircle },
              { to: "/groups", label: "Groups", icon: Users },
              { to: "/profile", label: "Profile", icon: User },
            ].map((item) => (
              <Link
                key={item.to}
                to={item.to}
                activeProps={{ className: "text-primary" }}
                inactiveProps={{ className: "text-muted-foreground" }}
                className="flex flex-col items-center gap-1 py-3 text-xs font-medium"
              >
                <item.icon className="size-5" />
                {item.label}
              </Link>
            ))}
          </div>
        </nav>
      ) : null}
    </div>
  );
}