export const EMAIL_DOMAIN = "bharatchat.app";
export const JARVIS_EMAIL = "jarvis@bharatchat.system";

export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase().replace(/[^a-z0-9_.]/g, "");
}

export function usernameToEmail(raw: string): string {
  return `${normalizeUsername(raw)}@${EMAIL_DOMAIN}`;
}

/** True when the input already looks like a real email address. */
export function isEmailAddress(raw: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw.trim());
}

/**
 * Login accepts either a username (mapped to its synthetic auth email)
 * or a real email address typed directly.
 */
export function resolveLoginEmail(raw: string): string {
  return isEmailAddress(raw) ? raw.trim().toLowerCase() : usernameToEmail(raw);
}

export type AppRole = "owner" | "manager" | "admin" | "helper" | "viewer";

export const ROLE_RANK: Record<AppRole, number> = {
  owner: 5,
  manager: 4,
  admin: 3,
  helper: 2,
  viewer: 1,
};

export function roleLabel(role: AppRole | null | undefined): string | null {
  if (!role) return null;
  if (role === "owner") return null;
  return role.charAt(0).toUpperCase() + role.slice(1);
}

export function topRole(roles: AppRole[]): AppRole | null {
  if (!roles.length) return null;
  return roles.slice().sort((a, b) => ROLE_RANK[b] - ROLE_RANK[a])[0]!;
}
