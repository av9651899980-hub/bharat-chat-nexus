import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type ProfileAvatarProps = {
  src?: string | null;
  name?: string | null;
  className?: string;
  textClassName?: string;
};

export function ProfileAvatar({ src, name, className = "size-11", textClassName = "text-sm" }: ProfileAvatarProps) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!src) {
      setSignedUrl(null);
      return () => {
        active = false;
      };
    }
    if (src.startsWith("http://") || src.startsWith("https://")) {
      setSignedUrl(src);
      return () => {
        active = false;
      };
    }

    supabase.storage
      .from("profile-photos")
      .createSignedUrl(src, 60 * 60)
      .then(({ data }) => {
        if (active) setSignedUrl(data?.signedUrl ?? null);
      });

    return () => {
      active = false;
    };
  }, [src]);

  const initial = (name?.trim().charAt(0) || "?").toUpperCase();

  return (
    <span className={`brand-gradient flex shrink-0 items-center justify-center overflow-hidden rounded-full font-bold text-primary-foreground ${className}`}>
      {signedUrl ? <img src={signedUrl} alt={`${name ?? "Profile"} avatar`} className="size-full object-cover" /> : <span className={textClassName}>{initial}</span>}
    </span>
  );
}