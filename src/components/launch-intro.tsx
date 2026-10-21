import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { INTRO_DURATION_MS, INTRO_STORAGE_KEY, shouldShowIntro } from "@/lib/launch-intro";

export function LaunchIntro() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    let hasSeen = false;
    try {
      hasSeen = window.localStorage.getItem(INTRO_STORAGE_KEY) === "yes";
      // Mark at launch, including skips, so reloads and navigation never replay.
      window.localStorage.setItem(INTRO_STORAGE_KEY, "yes");
    } catch {
      // Storage may be disabled; the root-mounted scene still only plays once per app session.
    }
    if (!shouldShowIntro(hasSeen, preference.matches)) return;

    setVisible(true);
    const timer = window.setTimeout(() => setVisible(false), INTRO_DURATION_MS);
    const onPreferenceChange = () => { if (preference.matches) setVisible(false); };
    preference.addEventListener("change", onPreferenceChange);
    return () => {
      window.clearTimeout(timer);
      preference.removeEventListener("change", onPreferenceChange);
    };
  }, []);

  useEffect(() => {
    if (!visible) return;
    const dismissWithEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setVisible(false);
    };
    window.addEventListener("keydown", dismissWithEscape);
    return () => window.removeEventListener("keydown", dismissWithEscape);
  }, [visible]);

  // Keep the underlying app loaded but inaccessible until skip or completion.
  useEffect(() => {
    if (!visible) return;
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement;
    const scene = document.querySelector<HTMLElement>(".launch-intro");
    const siblings = Array.from(scene?.parentElement?.children ?? []).filter(
      (element): element is HTMLElement => element instanceof HTMLElement && element !== scene && element.tagName !== "SCRIPT",
    );
    const inertStates = siblings.map((element) => element.inert);
    siblings.forEach((element) => { element.inert = true; });
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
      siblings.forEach((element, index) => { element.inert = inertStates[index] ?? false; });
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="launch-intro" role="dialog" aria-modal="true" aria-label="BharatChat opening" data-testid="launch-intro">
      <div className="intro-stage" aria-hidden="true">
        <div className="intro-core" />
        <div className="intro-ring" />
        <div className="intro-ring intro-ring-middle" />
        <div className="intro-ring intro-ring-inner" />
      </div>
      <div className="intro-sweep" aria-hidden="true" />
      <div className="intro-brand"><h1>Bharat<span>Chat</span></h1></div>
      <Button variant="outline" autoFocus onClick={() => setVisible(false)} className="intro-skip gap-2 border-border/60 bg-secondary/40 text-foreground">
        Skip <ArrowRight aria-hidden="true" className="size-4" />
      </Button>
    </div>
  );
}