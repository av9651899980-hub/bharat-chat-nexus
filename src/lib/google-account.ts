import { z } from "zod";

export const googleProfileSchema = z.object({
  username: z.string().trim().toLowerCase().min(3).max(24).regex(/^[a-z0-9_.]+$/),
  displayName: z.string().trim().min(2).max(40),
  mobile: z.string().trim().min(6).max(20).regex(/^[+0-9 -]+$/),
});

export function isDesignatedGoogleOwner(
  email: string | undefined, googleEmails: string[], oauthSession: boolean,
  configuredEmail: string | undefined,
) {
  const expected = configuredEmail?.trim().toLowerCase();
  return Boolean(expected && oauthSession && email?.toLowerCase() === expected &&
    googleEmails.some((value) => value.toLowerCase() === expected));
}

export function needsGoogleProfile(profile: { id: string } | null) {
  return profile === null;
}
/** Build up to 4 valid username candidates from a Google name and email. */
export function usernameSuggestions(name: string, email: string, seed = 52): string[] {
  const clean = (v: string) => v.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  const parts = clean(name).split("_").filter(Boolean);
  const first = parts[0] ?? clean(email.split("@")[0] ?? "") ?? "user";
  const last = parts[1] ?? "";
  const local = clean(email.split("@")[0] ?? "");
  const raw = [last ? `${first}_${last[0]}` : `${first}_${seed}`, local, `${first}_${seed % 100}`, `${first.slice(0, 4)}_bharat`, `${first}${seed + 7}`];
  const out: string[] = [];
  for (const r of raw) {
    const u = r.slice(0, 24);
    if (u.length >= 3 && /^[a-z0-9_.]+$/.test(u) && !out.includes(u)) out.push(u);
    if (out.length === 4) break;
  }
  return out;
}
