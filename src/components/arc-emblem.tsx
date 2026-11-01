import { MessageCircle } from "lucide-react";

/** JARVIS arc-reactor style emblem: two segmented golden rings spinning in opposite directions. */
export function ArcEmblem({ subtitle }: { subtitle: string }) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="relative size-36 text-primary" aria-hidden>
        <div className="absolute inset-3 rounded-full bg-primary/15 blur-2xl motion-safe:animate-pulse" />
        <svg viewBox="0 0 100 100" className="absolute inset-0 size-full motion-safe:animate-[spin_12s_linear_infinite] drop-shadow-[0_0_6px_currentColor]">
          <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="2.5"
            strokeLinecap="round" strokeDasharray="72 24.4" />
          <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeOpacity="0.35"
            strokeWidth="0.8" strokeDasharray="2 4" />
        </svg>
        <svg viewBox="0 0 100 100" className="absolute inset-0 size-full motion-safe:animate-[spin_8s_linear_infinite_reverse] drop-shadow-[0_0_4px_currentColor]">
          <circle cx="50" cy="50" r="35" fill="none" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeDasharray="90 20" />
        </svg>
        <div className="absolute inset-[30%] flex items-center justify-center rounded-full border border-primary/40 bg-card shadow-soft">
          <MessageCircle className="size-7 text-primary" strokeWidth={2.2} />
        </div>
      </div>
      <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-foreground">
        Bharat<span className="text-primary">Chat</span>
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
    </div>
  );
}
