import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { registerUser } from "@/lib/auth.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Create your BharatChat account" },
      {
        name: "description",
        content: "Register with your mobile number, username and display name to start chatting on BharatChat.",
      },
      { property: "og:title", content: "Create your BharatChat account" },
      { property: "og:description", content: "Join BharatChat and start messaging in seconds." },
    ],
  }),
  component: RegisterPage,
});

function RegisterPage() {
  const navigate = useNavigate();
  const register = useServerFn(registerUser);
  const [form, setForm] = useState({ mobile: "", username: "", displayName: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function update(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [key]: e.target.value });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const { email } = await register({ data: form });
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: form.password,
      });
      if (signInError) throw new Error("Account created. Please sign in.");
      navigate({ to: "/chats", replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed. Try again.");
    } finally {
      setBusy(false);
    }
  }

  const fields = [
    { key: "mobile" as const, label: "Mobile Number", type: "tel" },
    { key: "username" as const, label: "Username", type: "text" },
    { key: "displayName" as const, label: "Display Name", type: "text" },
    { key: "password" as const, label: "Password", type: "password" },
  ];

  return (
    <div className="min-h-screen bg-background px-6 py-12">
      <div className="mx-auto w-full max-w-md">
        <h1 className="text-2xl font-bold tracking-tight text-primary">Create Account</h1>
        <p className="mt-1 text-sm text-muted-foreground">All fields are required.</p>

        <form onSubmit={submit} className="mt-8 space-y-4">
          {fields.map((field) => (
            <div key={field.key}>
              <label className="text-xs font-semibold text-muted-foreground" htmlFor={field.key}>
                {field.label}
              </label>
              <input
                id={field.key}
                type={field.type}
                autoCapitalize={field.key === "displayName" ? "words" : "none"}
                value={form[field.key]}
                onChange={update(field.key)}
                className="mt-1 w-full rounded-2xl border border-input bg-card px-4 py-3 text-sm outline-none focus:border-ring"
              />
            </div>
          ))}

          {error ? <p className="text-xs font-medium text-destructive">{error}</p> : null}

          <button
            type="submit"
            disabled={busy}
            className="brand-gradient w-full rounded-2xl py-3.5 text-sm font-semibold text-primary-foreground shadow-soft disabled:opacity-60"
          >
            {busy ? "Creating…" : "Create Account"}
          </button>
        </form>

        <Link to="/" className="mt-5 block text-center text-sm font-semibold text-primary">
          Back to login
        </Link>
      </div>
    </div>
  );
}