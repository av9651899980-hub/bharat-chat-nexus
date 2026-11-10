import { getCookie, setCookie } from "@tanstack/react-start/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isDesignatedGoogleOwner } from "./google-account";
import { gatewayBindingMatches } from "./owner-gateway-binding";

const COOKIE = "bharatchat-owner-gateway";
// The verified Google identity on the account itself is the proof of ownership.
// A password sign-in must still pass, so we never require the current session's amr to contain oauth.
export async function designatedOwner(client: SupabaseClient) {
  const { data, error } = await client.auth.getUser();
  const googleEmails = (data.user?.identities ?? []).filter((i) => i.provider === "google" &&
    i.identity_data?.["email_verified"] === true).map((i) => String(i.identity_data?.["email"] ?? ""));
  return !error && isDesignatedGoogleOwner(data.user?.email, googleEmails, true, process.env["OWNER_GOOGLE_EMAIL"]);
}
async function sign(value: string) {
  const secret = process.env["GOD_KEY"];
  if (!secret) throw new Error("Verification unavailable");
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return Array.from(new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value))))
    .map((n) => n.toString(16).padStart(2, "0")).join("");
}
async function tokenFingerprint(token: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function grantGateway(userId: string, token: string) {
  const fingerprint = await tokenFingerprint(token);
  const payload = `${userId}.${Date.now() + 30 * 60 * 1000}.${fingerprint}`;
  setCookie(COOKIE, `${payload}.${await sign(payload)}`, {
    httpOnly: true, secure: true, sameSite: "strict", path: "/", maxAge: 30 * 60,
  });
}
export async function assertGateway(userId: string) {
  const cookie = getCookie(COOKIE);
  const parts = cookie?.split(".");
  if (!parts || parts.length !== 4) throw new Error("Forbidden");
  const { getRequest } = await import("@tanstack/react-start/server");
  const header = getRequest().headers.get("authorization") ?? "";
  if (!header.startsWith("Bearer ")) throw new Error("Forbidden");
  const token = header.slice("Bearer ".length);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.auth.getClaims(token);
  if (error || data?.claims.sub !== userId) throw new Error("Forbidden");
  if (!gatewayBindingMatches(userId, await tokenFingerprint(token), parts[0] ?? "", parts[2] ?? "", Number(parts[1]), Date.now())) {
    throw new Error("Forbidden");
  }
  const { safeEqual } = await import("./jarvis.server");
  const signature = parts[3];
  if (!signature || !safeEqual(signature, await sign(parts.slice(0, 3).join(".")))) throw new Error("Forbidden");
}