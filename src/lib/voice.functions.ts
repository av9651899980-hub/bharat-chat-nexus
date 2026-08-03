import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const uploadVoiceMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        chatId: z.string().uuid(),
        base64: z.string().min(10).max(6_000_000),
        mimeType: z.string().max(60).default("audio/webm"),
        duration: z.number().int().min(0).max(600),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: membership } = await context.supabase
      .from("chat_members")
      .select("id")
      .eq("chat_id", data.chatId)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!membership) throw new Error("You are not part of this conversation");

    const binary = Uint8Array.from(atob(data.base64), (c) => c.charCodeAt(0));
    const path = `${data.chatId}/${crypto.randomUUID()}.webm`;
    const { error } = await supabaseAdmin.storage
      .from("voice")
      .upload(path, binary, { contentType: data.mimeType, upsert: false });
    if (error) throw new Error("Voice message upload failed");

    const { error: insertError } = await context.supabase.from("messages").insert({
      chat_id: data.chatId,
      sender_id: context.userId,
      kind: "voice",
      audio_url: path,
      audio_duration: data.duration,
    });
    if (insertError) throw new Error("Voice message could not be sent");
    return { ok: true as const };
  });

export const getVoiceUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ path: z.string().min(1).max(300) }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const chatId = data.path.split("/")[0] ?? "";

    const { data: membership } = await context.supabase
      .from("chat_members")
      .select("id")
      .eq("chat_id", chatId)
      .eq("user_id", context.userId)
      .maybeSingle();

    if (!membership) {
      const { data: owner } = await context.supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", context.userId)
        .eq("role", "owner")
        .maybeSingle();
      if (!owner) throw new Error("Not allowed");
    }

    const { data: signed, error } = await supabaseAdmin.storage
      .from("voice")
      .createSignedUrl(data.path, 3600);
    if (error || !signed) throw new Error("Could not load the voice message");
    return { url: signed.signedUrl };
  });