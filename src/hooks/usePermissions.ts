import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { myPermissions } from "@/lib/permissions.functions";
import { useUserId } from "./useAccount";

/** Permissions of the signed-in user, resolved from rank defaults + overrides. */
export function usePermissions() {
  const userId = useUserId();
  const fetchPermissions = useServerFn(myPermissions);

  const query = useQuery({
    queryKey: ["permissions", userId],
    enabled: !!userId,
    queryFn: () => fetchPermissions({ data: undefined as never }),
  });

  const permissions = query.data?.permissions ?? [];
  return {
    ...query,
    permissions,
    can: (permission: string) => permissions.includes(permission),
    isStaff: permissions.length > 0,
  };
}
