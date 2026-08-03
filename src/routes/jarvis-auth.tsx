import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { jarvisLogin } from "@/lib/auth.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/jarvis-auth")({
  head: () => ({
    meta: [
      { title: "JARVIS — BharatChat" },
      { name: "description", content: "Secure JARVIS access for BharatChat platform administration." },
      { property: "og:title", content: "JARVIS — BharatChat" },
      { property: "og:description", content: "Secure JARVIS access for BharatChat." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: JarvisAuthPage,
});

function JarvisAuthPage() {
  const navigate = useNavigate();
  const login = useServerFn(jarvisLogin);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const { email } = await login({ data: { username, password } });
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) throw new Error("Authentication failed");
      navigate({ to: "/chats", replace: true });
    } catch {
      setError("Authentication failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="jarvis-surface flex min-h-screen flex-col justify-center px-6 py-12">
      <div className="mx-auto w-full max-w-md">
        <h1 className="text-center text-3xl font-black tracking-[0.4em] text-jarvis">JARVIS</h1>
        <div className="mx-auto mt-2 h-px w-24 bg-jarvis/40" />

        <form onSubmit={submit} className="jarvis-panel-card mt-10 space-y-4 p-6 shadow-jarvis">
          <div>
            <label className="text-[11px] font-semibold tracking-widest text-jarvis-cyan" htmlFor="ju">
              JARVIS Username
            </label>
            <input
              id="ju"
              value={username}
              autoCapitalize="none"
              onChange={(e) => setUsername(e.target.value)}
              className="mt-1 w-full rounded-xl border border-jarvis-border bg-jarvis-bg px-4 py-3 text-sm text-jarvis-muted outline-none focus:border-jarvis"
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold tracking-widest text-jarvis-cyan" htmlFor="jp">
              JARVIS Password
            </label>
            <input
              id="jp"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-xl border border-jarvis-border bg-jarvis-bg px-4 py-3 text-sm text-jarvis-muted outline-none focus:border-jarvis"
            />
          </div>

          {error ? <p className="text-xs font-medium text-destructive">{error}</p> : null}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-jarvis py-3.5 text-sm font-bold tracking-widest text-jarvis-foreground disabled:opacity-60"
          >
            {busy ? "VERIFYING…" : "LOGIN"}
          </button>
        </form>

        <Link to="/" className="mt-6 block text-center text-xs text-jarvis-muted">
          Back
        </Link>
      </div>
    </div>
  );
}