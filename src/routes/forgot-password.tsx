import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { requestPasswordCode } from "@/lib/password-reset.functions";
import { ArcEmblem } from "@/components/arc-emblem";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Reset your BharatChat password" },
      { name: "description", content: "Verify a 6-digit email code and set a new BharatChat password." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:title", content: "Reset your BharatChat password" },
      { property: "og:description", content: "Verify a 6-digit email code and set a new BharatChat password." },
    ],
  }),
  component: ForgotPasswordPage,
});

const input = "mt-1 w-full rounded-2xl border border-input bg-card px-4 py-3 text-sm outline-none focus:border-ring";
const primaryBtn = "brand-gradient w-full rounded-2xl py-3.5 text-sm font-semibold text-primary-foreground shadow-soft disabled:opacity-60";

function strength(p: string) {
  let s = 0;
  if (p.length >= 8) s++;
  if (/[A-Z]/.test(p) && /[a-z]/.test(p)) s++;
  if (/\d/.test(p) || /[^A-Za-z0-9]/.test(p)) s++;
  return ["Weak", "Weak", "Good", "Strong"][s];
}

function ForgotPasswordPage() {
  const navigate = useNavigate();
  const request = useServerFn(requestPasswordCode);
  const [step, setStep] = useState<"request" | "code" | "password">("request");
  const [handle, setHandle] = useState("");
  const [email, setEmail] = useState("");
  const [hint, setHint] = useState("");
  const [code, setCode] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [show, setShow] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function send(e?: React.FormEvent) {
    e?.preventDefault(); setError(null); setBusy(true);
    try {
      const res = await request({ data: { handle, redirectTo: `${window.location.origin}/reset-password` } });
      setEmail(res.email); setHint(res.hint); setStep("code"); setCooldown(60);
    } catch { setError("Could not send the code. Check your username or email and try again."); }
    finally { setBusy(false); }
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault(); setError(null);
    if (!/^\d{6,8}$/.test(code)) { setError("Enter the code from your email."); return; }
    setBusy(true);
    const { error: err } = await supabase.auth.verifyOtp({ email, token: code, type: "recovery" });
    setBusy(false);
    if (err) { setError("That code is incorrect or expired."); return; }
    setStep("password");
  }

  async function save(e: React.FormEvent) {
    e.preventDefault(); setError(null);
    if (pw.length < 6 || pw.length > 72) { setError("Use a password between 6 and 72 characters."); return; }
    if (pw !== pw2) { setError("Passwords do not match."); return; }
    setBusy(true);
    const { error: err } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (err) { setError("Could not update your password. Try again."); return; }
    await navigate({ to: "/chats", replace: true });
  }

  return (
    <div className="min-h-screen bg-background px-6 py-12">
      <div className="mx-auto w-full max-w-md animate-rise">
        <ArcEmblem subtitle="Recover your account" />
        <div className="mt-6 flex justify-center gap-2" aria-hidden>
          {["request", "code", "password"].map((s, i) => (
            <span key={s} className={`h-1.5 w-10 rounded-full ${["request", "code", "password"].indexOf(step) >= i ? "bg-primary" : "bg-muted"}`} />
          ))}
        </div>

        {step === "request" ? (
          <form onSubmit={send} className="mt-6 space-y-4">
            <p className="text-sm text-muted-foreground">Enter your username or email. We'll email you a verification code.</p>
            <div>
              <label className="text-xs font-semibold text-muted-foreground" htmlFor="handle">Username or Email</label>
              <input id="handle" required value={handle} autoCapitalize="none" onChange={(e) => setHandle(e.target.value)} className={input} />
            </div>
            {error ? <p role="alert" className="text-xs text-destructive">{error}</p> : null}
            <button type="submit" disabled={busy || !handle.trim()} className={primaryBtn}>{busy ? "Sending…" : "Send code"}</button>
          </form>
        ) : step === "code" ? (
          <form onSubmit={verify} className="mt-6 space-y-4">
            <p className="text-sm text-muted-foreground">We sent a code to <span className="text-primary">{hint}</span>.</p>
            <input aria-label="Verification code" inputMode="numeric" autoComplete="one-time-code" maxLength={8}
              value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              className={`${input} text-center text-2xl font-bold tracking-[0.5em]`} />
            {error ? <p role="alert" className="text-xs text-destructive">{error}</p> : null}
            <button type="submit" disabled={busy} className={primaryBtn}>{busy ? "Verifying…" : "Verify code"}</button>
            <button type="button" disabled={busy || cooldown > 0} onClick={() => send()}
              className="w-full text-center text-xs font-semibold text-muted-foreground disabled:opacity-60">
              {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
            </button>
          </form>
        ) : (
          <form onSubmit={save} className="mt-6 space-y-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground" htmlFor="pw">New password</label>
              <div className="relative">
                <input id="pw" type={show ? "text" : "password"} autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} className={`${input} pr-12`} />
                <button type="button" aria-label={show ? "Hide password" : "Show password"} onClick={() => setShow(!show)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">{show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button>
              </div>
              {pw ? <p className="mt-1 text-xs text-muted-foreground">Strength: <span className="text-primary">{strength(pw)}</span></p> : null}
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground" htmlFor="pw2">Confirm password</label>
              <input id="pw2" type={show ? "text" : "password"} autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} className={input} />
            </div>
            {error ? <p role="alert" className="text-xs text-destructive">{error}</p> : null}
            <button type="submit" disabled={busy} className={primaryBtn}>{busy ? "Saving…" : "Save new password"}</button>
          </form>
        )}

        <Link to="/" className="mt-6 block text-center text-sm font-semibold text-primary">Back to login</Link>
      </div>
    </div>
  );
}
