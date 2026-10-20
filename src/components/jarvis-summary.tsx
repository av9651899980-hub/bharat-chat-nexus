import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AudioLines, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { summarizeConversation } from "@/lib/jarvis-summary.functions";

export function JarvisSummary({ chatId }: { chatId: string }) {
  const summarize = useServerFn(summarizeConversation);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ text: string | null; error: string | null } | null>(null);
  async function run() {
    if (busy) return;
    setBusy(true); setResult(null);
    try { setResult(await summarize({ data: { chatId } })); }
    catch (error) { setResult({ text: null, error: error instanceof Error ? error.message : "Summary unavailable." }); }
    finally { setBusy(false); }
  }
  return <section className="border-t border-border pt-3">
    <div className="flex items-center justify-between gap-3">
      <span className="flex items-center gap-2 text-xs font-semibold text-primary"><AudioLines className="size-4" /> JARVIS AI</span>
      <Button variant="secondary" size="sm" onClick={run} disabled={busy}>{busy ? <><Loader2 className="animate-spin" /> Summarizing…</> : "Summarize conversation"}</Button>
    </div>
    {busy ? <p role="status" className="mt-3 text-xs text-muted-foreground">Reading recent messages…</p> : null}
    {result ? <div aria-live="polite" className="mt-3 border-l-2 border-primary pl-3">
      <div className="flex items-start gap-2"><p className={`min-w-0 flex-1 whitespace-pre-wrap break-words text-sm leading-relaxed ${result.error ? "text-destructive" : "text-foreground"}`}>{result.text ?? result.error}</p><Button size="icon" variant="ghost" aria-label="Dismiss summary" onClick={() => setResult(null)}><X /></Button></div>
    </div> : null}
  </section>;
}