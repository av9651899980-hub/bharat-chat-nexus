import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth/callback")({
  head: () => ({ meta: [
    { title: "Google sign-in — BharatChat" }, { name: "description", content: "Complete your secure BharatChat sign-in." },
    { property: "og:title", content: "Google sign-in — BharatChat" },
    { property: "og:description", content: "Complete your secure BharatChat sign-in." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ] }),
  component: Callback,
});
function Callback() {
  const navigate = useNavigate();
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    void supabase.auth.getUser().then(({ data, error }) => {
      if (!active) return;
      if (error || !data.user) setFailed(true);
      else void navigate({ to: "/chats", replace: true });
    }).catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, [navigate]);
  return <div className="flex min-h-screen items-center justify-center bg-background px-6">
    <div className="text-center"><p>{failed ? "Google sign-in did not finish." : "Completing sign-in…"}</p>
      {failed ? <Link to="/" className="mt-4 block text-primary">Back to login</Link> : null}</div>
  </div>;
}