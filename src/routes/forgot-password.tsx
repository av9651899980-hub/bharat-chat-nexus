import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { isEmailAddress } from "@/lib/identity";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Reset your BharatChat password" },
      {
        name: "description",
        content: "Request a password reset link for your BharatChat account.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:title", content: "Reset your BharatChat password" },
      {
        property: "og:description",
        content: "Request a password reset link for your BharatChat account.",
      },
    ],
  }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!isEmailAddress(email)) {
      setError("Enter the email address you registered with.");
      return;
    }
    setBusy(true);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    if (resetError) {
      setError("Could not send the reset link. Try again in a moment.");
      return;
    }
    setSent(true);
  }

  return (
    <div className="flex min-h-screen flex-col justify-between bg-background px-6 py-12">
      <div className="mx-auto w-full max-w-md animate-rise">
        <h1 className="text-2xl font-bold tracking-tight">
          Bharat<span className="text-primary">Chat</span>
        </h1>
        <h2 className="mt-6 text-xl font-semibold">Forgot password</h2>

        {sent ? (
          <div className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-soft animate-pop">
            <p className="text-sm font-semibold">Check your email</p>
            <p className="mt-2 text-sm text-muted-foreground">
              We sent a password reset link to <span className="text-primary">{email.trim()}</span>.
              Open it on this device to set a new password.
            </p>
          </div>
        ) : (
          <>
            <p className="mt-2 text-sm text-muted-foreground">
              Enter the email address you registered with and we'll send you a reset link.
            </p>
            <form onSubmit={submit} className="mt-8 space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground" htmlFor="email">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  autoCapitalize="none"
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 w-full rounded-2xl border border-input bg-card px-4 py-3 text-sm outline-none focus:border-ring"
                />
              </div>

              {error ? <p className="text-xs font-medium text-destructive">{error}</p> : null}

              <button
                type="submit"
                disabled={busy}
                className="brand-gradient w-full rounded-2xl py-3.5 text-sm font-semibold text-primary-foreground shadow-soft disabled:opacity-60"
              >
                {busy ? "Sending…" : "Send reset link"}
              </button>
            </form>
          </>
        )}

        <Link to="/" className="mt-6 block text-center text-sm font-semibold text-primary">
          Back to login
        </Link>
      </div>

      <div className="mx-auto mt-10 w-full max-w-md text-center">
        <p className="text-[11px] text-muted-foreground">
          Older accounts created with only a username can't receive email — sign in with your
          username instead.
        </p>
      </div>
    </div>
  );
}
