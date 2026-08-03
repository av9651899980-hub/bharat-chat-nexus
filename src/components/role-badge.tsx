import { roleLabel, type AppRole } from "@/lib/identity";

export function RoleBadge({ role }: { role: AppRole | null | undefined }) {
  const label = roleLabel(role);
  if (!label) return null;
  return (
    <span className="ml-1 rounded-full border border-accent/50 bg-accent/15 px-2 py-[1px] text-[10px] font-semibold tracking-wide text-accent-foreground">
      {label}
    </span>
  );
}