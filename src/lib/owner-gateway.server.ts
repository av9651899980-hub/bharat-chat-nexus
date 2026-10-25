import { getCookie, setCookie } from "@tanstack/react-start/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isDesignatedGoogleOwner } from "./google-account";

const COOKIE = "bharatchat-owner-gateway";
export async function designatedOwner(client: SupabaseClient, claims: Record<string, unknown>) {
  const { data, error } = await client.auth.getUser();
  const methods = Array.isArray(claims["amr"]) ? claims["amr"] : [];
  const oauth = methods.some((m) => typeof m === "object" && m !== null && "method" in m && m.method === "oauth");
  const googleEmails = (data.user?.identities ?? []).filter((i) => i.provider === "google" &&
    i.identity_data?.["email_verified"] === true).map((i) => String(i.identity_data?.["email"] ?? ""));
  return !error && isDesignatedGoogleOwner(data.user?.email, googleEmails, oauth, process.env["OWNER_GOOGLE_EMAIL"]);
}
async function sign(value: string) {
  const secret = process.env["GOD_KEY"];
  if (!secret) throw new Error("Verification unavailable");
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return Array.from(new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value))))
    .map((n) => n.toString(16).padStart(2, "0")).join("");
}
export async function grantGateway(userId: string, sessionId: string) {
  const payload = `${userId}.${sessionId}.${Date.now() + 30 * 60 * 1000}`;
  setCookie(COOKIE, `${payload}.${await sign(payload)}`, {
    httpOnly: true, secure: true, sameSite: "strict", path: "/", maxAge: 30 * 60,
  });
}
export async function assertGateway(userId: string) {
  const cookie = getCookie(COOKIE);
  const parts = cookie?.split(".");
  if (!parts || parts.length !== 4 || parts[0] !== userId || Number(parts[2]) <= Date.now()) throw new Error("Forbidden");
  const { getRequest } = await import("@tanstack/react-start/server");
  const header = getRequest().headers.get("authorization") ?? "";
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.auth.getClaims(header.replace(/^Bearer /, ""));
  if (error || data?.claims.session_id !== parts[1]) throw new Error("Forbidden");
  const { safeEqual } = await import("./jarvis.server");
  const signature = parts[3];
  if (!signature || !safeEqual(signature, await sign(parts.slice(0, 3).join(".")))) throw new Error("Forbidden");
}