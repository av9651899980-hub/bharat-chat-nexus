import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

// WhatsApp-style full-screen profile photo viewer.
export function PhotoLightbox({
  src,
  name,
  onClose,
}: {
  src: string;
  name: string;
  onClose: () => void;
}) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (src.startsWith("http://") || src.startsWith("https://")) {
      setUrl(src);
      return () => { active = false; };
    }
    supabase.storage
      .from("profile-photos")
      .createSignedUrl(src, 60 * 60)
      .then(({ data }) => {
        if (active) setUrl(data?.signedUrl ?? null);
      });
    return () => { active = false; };
  }, [src]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-scrim p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`${name} profile photo`}
    >
      <button
        onClick={onClose}
        aria-label="Close photo"
        className="absolute right-4 top-4 flex size-11 items-center justify-center rounded-full bg-card/80 text-foreground"
      >
        <X className="size-5" />
      </button>
      {url ? (
        <img
          src={url}
          alt={`${name} profile photo`}
          className="max-h-[85vh] max-w-full rounded-2xl object-contain animate-pop"
          onClick={(event) => event.stopPropagation()}
        />
      ) : (
        <div className="flex size-24 items-center justify-center rounded-full bg-card/60 text-sm text-muted-foreground">
          Loading…
        </div>
      )}
    </div>
  );
}
