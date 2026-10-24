import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Bell, Mic, Camera, ShieldCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { resolveLoginEmail } from "@/lib/identity";
import { Button } from "@/components/ui/button";

const PERMISSION_KEY = "bharatchat.permissions.completed";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BharatChat — Simple, fast, secure messaging" },
      {
        name: "description",
        content:
          "BharatChat is a fast, modern messaging app for one-to-one chats, groups and voice messages.",
      },
      { property: "og:title", content: "BharatChat — Simple, fast, secure messaging" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      {
        property: "og:description",
        content:
          "BharatChat is a fast, modern messaging app for one-to-one chats, groups and voice messages.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  const navigate = useNavigate();
  const [stage, setStage] = useState<"loading" | "permissions" | "login">("loading");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        navigate({ to: "/chats", replace: true });
        return;
      }
      const done =
        typeof window !== "undefined" && window.localStorage.getItem(PERMISSION_KEY) === "yes";
      setStage(done ? "login" : "permissions");
    });
  }, [navigate]);

  if (stage === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  return stage === "permissions" ? (
    <PermissionSetup onDone={() => setStage("login")} />
  ) : (
    <LoginScreen />
  );
}

function PermissionSetup({ onDone }: { onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const [state, setState] = useState({ notifications: "pending", microphone: "pending" });

  async function requestAll() {
    setBusy(true);
    let notifications = "unavailable";
    let microphone = "unavailable";
    try {
      if (typeof Notification !== "undefined") {
        notifications = await Notification.requestPermission();
      }
    } catch {
      notifications = "denied";
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      microphone = "granted";
    } catch {
      microphone = "denied";
    }
    setState({ notifications, microphone });
    setBusy(false);
    window.localStorage.setItem(PERMISSION_KEY, "yes");
    if (microphone !== "granted") {
      toast.message("Microphone access is off", {
        description: "Voice messages will stay disabled until you allow the microphone.",
      });
    }
    onDone();
  }

  return (
    <div className="flex min-h-screen flex-col justify-between bg-background px-6 py-12">
      <div className="mx-auto w-full max-w-md">
        <p className="mb-8 text-2xl font-extrabold">
          Bharat<span className="text-primary">Chat</span>
        </p>
        <h1 className="text-2xl font-bold tracking-tight">Set up BharatChat</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          BharatChat needs a few permissions before you sign in. You can change these later in your
          device settings.
        </p>

        <ul className="mt-8 space-y-3">
          {[
            {
              icon: Bell,
              title: "Notifications",
              body: "So you never miss a new message.",
              key: "notifications",
            },
            {
              icon: Mic,
              title: "Microphone",
              body: "Required to record voice messages.",
              key: "microphone",
            },
            {
              icon: Camera,
              title: "Camera",
              body: "Requested only when camera features are enabled.",
              key: "camera",
            },
          ].map((item) => (
            <li
              key={item.title}
              className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4 shadow-soft"
            >
              <span className="rounded-xl bg-secondary p-2 text-secondary-foreground">
                <item.icon className="size-5" />
              </span>
              <div>
                <p className="text-sm font-semibold">{item.title}</p>
                <p className="text-xs text-muted-foreground">{item.body}</p>
                {item.key in state ? (
                  <p className="mt-1 text-[11px] font-medium text-primary">
                    {state[item.key as "notifications" | "microphone"]}
                  </p>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="mx-auto w-full max-w-md">
        <Button
          onClick={requestAll}
          disabled={busy}
          className="brand-gradient w-full rounded-2xl py-3.5 text-sm font-semibold text-primary-foreground shadow-soft disabled:opacity-60"
        >
          {busy ? "Requesting…" : "Continue"}
        </Button>
        <p className="mt-3 flex items-center justify-center gap-1 text-[11px] text-muted-foreground">
          <ShieldCheck className="size-3" /> Permissions are handled by your device.
        </p>
      </div>
    </div>
  );
}

function LoginScreen() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!username.trim() || !password) {
      setError("Enter your username or email and password.");
      return;
    }
    setBusy(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: resolveLoginEmail(username),
      password,
    });
    setBusy(false);
    if (signInError) {
      setError("Incorrect username, email or password.");
      return;
    }
    navigate({ to: "/chats", replace: true });
  }

  return (
    <div className="flex min-h-screen flex-col justify-between bg-background px-6 py-12">
      <div className="mx-auto w-full max-w-md animate-rise">
        <h1 className="text-3xl font-extrabold">
          Bharat<span className="text-primary">Chat</span>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Sign in to continue your conversations.
        </p>

        <form onSubmit={submit} className="mt-8 space-y-4 animate-fade">
          <div>
            <label className="text-xs font-semibold text-muted-foreground" htmlFor="username">
              Username or Email
            </label>
            <input
              id="username"
              value={username}
              autoCapitalize="none"
              autoComplete="username"
              onChange={(e) => setUsername(e.target.value)}
              className="mt-1 w-full rounded-2xl border border-input bg-card px-4 py-3 text-sm outline-none focus:border-ring"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              autoComplete="current-password"
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-2xl border border-input bg-card px-4 py-3 text-sm outline-none focus:border-ring"
            />
          </div>

          {error ? <p className="text-xs font-medium text-destructive animate-pop">{error}</p> : null}

          <Button
            type="submit"
            disabled={busy}
            className="brand-gradient w-full rounded-2xl py-3.5 text-sm font-semibold text-primary-foreground shadow-soft disabled:opacity-60"
          >
            {busy ? "Signing in…" : "LOGIN"}
          </Button>

          <Link
            to="/forgot-password"
            className="block text-center text-xs font-semibold text-muted-foreground transition-colors hover:text-primary"
          >
            Forgot password?
          </Link>
        </form>

        <Link to="/register" className="mt-5 block text-center text-sm font-semibold text-primary">
          Create Account
        </Link>
      </div>

      <div className="mx-auto mt-10 w-full max-w-md text-center">
        <Link
          to="/jarvis-auth"
          className="text-[11px] font-semibold tracking-[0.35em] text-jarvis opacity-80 transition-opacity hover:opacity-100"
        >
          JARVIS
        </Link>
        <div className="mt-4">
          <Link to="/privacy" className="text-[11px] text-muted-foreground underline">
            Privacy Policy & Terms
          </Link>
        </div>
      </div>
    </div>
  );
}
