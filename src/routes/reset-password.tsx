import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Set a new BharatChat password" },
      { name: "description", content: "Choose a new password for your BharatChat account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:title", content: "Set a new BharatChat password" },
      { property: "og:description", content: "Choose a new password for your BharatChat account." },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [isRecovery, setIsRecovery] = useState<boolean | null>(null);

  // Supabase delivers the recovery session in the URL hash.
  useEffect(() => {
    setIsRecovery(window.location.hash.includes("type=recovery"));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setBusy(true);
    // Recovery sessions are exempt from the current-password requirement.
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (updateError) {
      setError("Could not update the password. Open the reset link again.");
      return;
    }
    navigate({ to: "/chats", replace: true });
  }

  if (isRecovery === false) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
        <div className="w-full max-w-md text-center animate-rise">
          <p className="text-sm text-muted-foreground">
            This page is for password reset links. Open the link from your email, or sign in below.
          </p>
          <Link to="/" className="mt-4 inline-block text-sm font-semibold text-primary">
            Back to login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col justify-between bg-background px-6 py-12">
      <div className="mx-auto w-full max-w-md animate-rise">
        <h1 className="text-2xl font-bold tracking-tight">
          Bharat<span className="text-primary">Chat</span>
        </h1>
        <h2 className="mt-6 text-xl font-semibold">Set a new password</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Choose a new password for your account.
        </p>

        <form onSubmit={submit} className="mt-8 space-y-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground" htmlFor="password">
              New password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-2xl border border-input bg-card px-4 py-3 text-sm outline-none focus:border-ring"
            />
          </div>

          {error ? <p className="text-xs font-medium text-destructive">{error}</p> : null}

          <button
            type="submit"
            disabled={busy}
            className="brand-gradient w-full rounded-2xl py-3.5 text-sm font-semibold text-primary-foreground shadow-soft disabled:opacity-60"
          >
            {busy ? "Saving…" : "Save password"}
          </button>
        </form>
      </div>
    </div>
  );
}
