import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { canSummarizeConversation } from "./access-rules";

export const summarizeConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ chatId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: membership, error: memberError } = await context.supabase
      .from("chat_members").select("user_id").eq("chat_id", data.chatId).eq("user_id", context.userId);
    if (memberError || !canSummarizeConversation(context.userId, (membership ?? []).map(m => m.user_id))) {
      throw new Error("Only members can summarize this conversation.");
    }
    const { data: messages, error } = await context.supabase.from("messages")
      .select("content, kind, created_at").eq("chat_id", data.chatId)
      .is("deleted_at", null).eq("kind", "text").order("created_at", { ascending: false }).limit(80);
    if (error) throw new Error("This conversation could not be loaded.");
    if (!messages?.length) return { text: null, error: "No text messages to summarize yet." };
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) return { text: null, error: "JARVIS AI is not configured. The project owner must enable Lovable AI." };
    const { runSummary } = await import("./jarvis-summary.server");
    return runSummary(getRequest(), apiKey, [...messages].reverse());
  });