import { useEffect, useState, type ReactNode, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useRouter } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { completeGoogleProfile } from "@/lib/google-account.functions";
import { googleProfileSchema } from "@/lib/google-account";
import { Button } from "@/components/ui/button";

// The protected layout remains integration-owned; this boundary withholds app UI until a real profile exists.
export function GoogleProfileBoundary({ children }: { children: ReactNode }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const protectedRoute = router.state.matches.some((match) => match.routeId.startsWith("/_authenticated"));
  const account = useQuery({ queryKey: ["google-profile-state"], enabled: protectedRoute,
    queryFn: async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user) throw new Error("Could not verify your sign-in.");
      const { data: profile, error: profileError } = await supabase.from("profiles").select("id")
        .eq("id", data.user.id).maybeSingle();
      if (profileError) throw new Error("Could not load your profile.");
      return { user: data.user, profile };
    } });
  if (!protectedRoute) return children;
  if (account.isPending) return <Status text="Loading your account…" />;
  if (account.isError) return <Status text="Could not load your account.">
    <Button onClick={() => account.refetch()}>Try again</Button>
  </Status>;
  if (!account.data.profile) return <ProfileSetup userId={account.data.user.id}
    name={String(account.data.user.user_metadata["full_name"] ?? "")}
    email={account.data.user.email ?? ""}
    google={account.data.user.identities?.some((i) => i.provider === "google") ?? false}
    onDone={async () => { await queryClient.invalidateQueries(); await router.invalidate(); }} />;
  return children;
}
function Status({ text, children }: { text: string; children?: ReactNode }) {
  return <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6"><p>{text}</p>{children}</div>;
}
function ProfileSetup({ userId, name, email, google, onDone }: {
  userId: string; name: string; email: string; google: boolean; onDone: () => Promise<void>;
}) {
  const save = useServerFn(completeGoogleProfile);
  const queryClient = useQueryClient();
  const router = useRouter();
  const [form, setForm] = useState({ username: "", displayName: name, mobile: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passwordSet, setPasswordSet] = useState(false);
  useEffect(() => { setForm((previous) => ({ ...previous, displayName: name })); }, [name]);
  async function submit(event: FormEvent) {
    event.preventDefault(); setError(null);
    const parsed = googleProfileSchema.safeParse(form);
    if (!parsed.success) { setError("Enter a valid username (3–24 letters, numbers, dots or underscores), name and mobile number."); return; }
    if (!passwordSet && (form.password.length < 6 || form.password.length > 72)) {
      setError("Use a password between 6 and 72 characters."); return;
    }
    setBusy(true);
    try {
      const { data: taken, error: lookupError } = await supabase.from("profiles").select("id")
        .eq("username", parsed.data.username).neq("id", userId).maybeSingle();
      if (lookupError) throw new Error("Could not check your username. Try again.");
      if (taken) throw new Error("That username is already taken. Choose another.");
      if (!passwordSet) {
        // Auth owns password hashing. Never write passwords to profiles or metadata.
        const { error: passwordError } = await supabase.auth.updateUser({ password: form.password });
        if (passwordError) throw new Error(`Could not set your password: ${passwordError.message}`);
        setPasswordSet(true); setForm((previous) => ({ ...previous, password: "" }));
      }
      await save({ data: parsed.data });
      await onDone();
    } catch (err) { setError(err instanceof Error ? err.message : "Could not finish setup. Please retry."); }
    finally { setBusy(false); }
  }
  async function signOut() {
    await queryClient.cancelQueries(); queryClient.clear(); await supabase.auth.signOut();
    await router.navigate({ to: "/", replace: true });
  }
  if (!google) return <Status text="Your account profile is unavailable."><Button onClick={signOut}>Back to login</Button></Status>;
  return <div className="min-h-screen bg-background px-6 py-12"><div className="mx-auto w-full max-w-md">
    <h1 className="text-2xl font-bold text-primary">Complete your profile</h1>
    <p className="mt-2 break-all text-sm text-muted-foreground">{email}</p>
    <form onSubmit={submit} className="mt-8 space-y-4">
      {([{ key: "username", label: "Username", type: "text" }, { key: "displayName", label: "Display name", type: "text" },
        { key: "mobile", label: "Mobile number", type: "tel" },
        ...(!passwordSet ? [{ key: "password", label: "Password", type: "password" }] : [])] as
        { key: keyof typeof form; label: string; type: string }[]).map((field) => <div key={field.key}>
          <label htmlFor={`setup-${field.key}`} className="text-xs font-semibold text-muted-foreground">{field.label}</label>
          <input id={`setup-${field.key}`} type={field.type} required value={form[field.key]}
            autoComplete={field.key === "password" ? "new-password" : field.key === "mobile" ? "tel" : "off"}
            autoCapitalize={field.key === "displayName" ? "words" : "none"} disabled={busy}
            onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
            className="mt-1 w-full rounded-2xl border border-input bg-card px-4 py-3 text-sm outline-none focus:border-ring" />
        </div>)}
      {error ? <p role="alert" className="text-xs text-destructive">{error}</p> : null}
      <Button disabled={busy} type="submit" className="h-12 w-full rounded-2xl">{busy ? "Saving…" : "Continue"}</Button>
    </form>
    <Button variant="ghost" disabled={busy} onClick={signOut} className="mt-4 w-full">Sign out</Button>
  </div></div>;
}