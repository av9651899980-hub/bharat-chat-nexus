import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { lovable } from "@/integrations/lovable";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export function GoogleSignIn() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return <div className="space-y-2">
    <Button variant="outline" disabled={busy} className="h-12 w-full rounded-2xl" onClick={async () => {
      setBusy(true); setError(null);
      try {
        const result = await lovable.auth.signInWithOAuth("google", {
          redirect_uri: `${window.location.origin}/auth/callback`, extraParams: { prompt: "select_account" },
        });
        if (result.error) throw result.error;
        if (result.redirected) return;
        const { data, error: authError } = await supabase.auth.getUser();
        if (authError || !data.user) throw new Error("Google sign-in was cancelled or could not finish.");
        await navigate({ to: "/chats", replace: true });
      } catch {
        setError("Google sign-in did not finish. You can try again or use your password.");
      } finally { setBusy(false); }
    }}>
      {busy ? <Loader2 className="size-4 animate-spin" /> : null}
      {busy ? "Connecting…" : "Continue with Google"}
    </Button>
    {error ? <p role="alert" className="text-xs text-destructive">{error}</p> : null}
  </div>;
}