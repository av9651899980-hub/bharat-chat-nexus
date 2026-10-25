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