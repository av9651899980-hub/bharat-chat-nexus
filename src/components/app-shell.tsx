import { Link, useNavigate } from "@tanstack/react-router";
import { Bell, MessageCircle, Users, User, ShieldCheck } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useAccount } from "@/hooks/useAccount";

function JarvisMark() {
  return (
    <Link
      to="/omnivers"
      aria-label="JARVIS"
      className="rounded-md border border-accent/35 bg-accent/10 px-2.5 py-2 text-[11px] font-semibold text-accent hover:bg-accent/20"
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
  const isStaff = (data?.roles?.length ?? 0) > 0;

  const navItems = [
    { to: "/chats", label: "Chats", icon: MessageCircle },
    { to: "/groups", label: "Groups", icon: Users },
    { to: "/profile", label: "Profile", icon: User },
    ...(isStaff ? [{ to: "/powers", label: "Powers", icon: ShieldCheck }] : []),
  ];

  const { data: unread } = useQuery({
    queryKey: ["unread-notifications", userId],
    enabled: !!userId,
    refetchInterval: 20000,
    queryFn: async () => {
      const { count } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId ?? "")
        .eq("is_read", false);
      return count ?? 0;
    },
  });

  return (
    <div className="app-shell relative flex min-h-dvh flex-col bg-background">
      <header className="sticky top-0 z-20 border-b border-border/70 bg-card/95 shadow-soft backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-2 px-4 py-3 sm:px-6">
          <Button
            variant="ghost"
            onClick={() => navigate({ to: "/chats" })}
            className="h-11 min-w-0 justify-start px-0 text-lg font-bold text-foreground hover:bg-transparent hover:text-primary"
          >
            <span className="truncate">
              {title === "BharatChat" ? (
                <>
                  Bharat<span className="text-primary">Chat</span>
                </>
              ) : (
                title
              )}
            </span>
          </Button>
          <div className="flex shrink-0 items-center gap-2">
            {data?.isJarvis ? <JarvisMark /> : null}
            <Link
              to="/notifications"
              aria-label="Notifications"
              className="relative flex size-11 items-center justify-center rounded-lg hover:bg-secondary"
            >
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

      <main className="relative mx-auto w-full max-w-3xl flex-1 px-4 pb-28 pt-6 sm:px-6">
        {children}
      </main>

      {showNav ? (
        <nav
          aria-label="Main navigation"
          className="fixed inset-x-0 bottom-0 z-20 border-t border-border/70 bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md"
        >
          <div
            className={`mx-auto grid w-full max-w-3xl ${isStaff ? "grid-cols-4" : "grid-cols-3"}`}
          >
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                activeProps={{ className: "text-primary bg-primary/5 border-t-primary" }}
                inactiveProps={{ className: "text-muted-foreground" }}
                className="flex min-h-16 flex-col items-center justify-center gap-1.5 border-t-2 border-t-transparent py-3 text-xs font-semibold hover:bg-secondary"
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
