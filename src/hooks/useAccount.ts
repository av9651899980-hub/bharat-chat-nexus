import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { topRole, type AppRole } from "@/lib/identity";

export function useUserId() {
  const [userId, setUserId] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active) setUserId(data.session?.user.id ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user.id ?? null);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return userId;
}

export function useAccount() {
  const userId = useUserId();

  const query = useQuery({
    queryKey: ["account", userId],
    enabled: !!userId,
    queryFn: async () => {
      const [{ data: profile }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", userId!).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", userId!),
      ]);
      const roleList = (roles ?? []).map((r) => r.role as AppRole);
      return {
        profile,
        roles: roleList,
        role: topRole(roleList),
        isJarvis: roleList.includes("owner"),
      };
    },
  });

  return { userId, ...query };
}