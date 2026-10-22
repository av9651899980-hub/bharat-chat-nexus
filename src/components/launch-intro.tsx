import { useEffect, useState } from "react";
import { getIntroDuration } from "@/lib/launch-intro";

export function LaunchIntro() {
  const [visible, setVisible] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    // The root survives navigation; a fresh document launch gets a fresh scene.
    setReducedMotion(preference.matches);
    setVisible(true);
    let timer = window.setTimeout(() => setVisible(false), getIntroDuration(preference.matches));
    const onPreferenceChange = () => {
      setReducedMotion(preference.matches);
      if (preference.matches) {
        window.clearTimeout(timer);
        timer = window.setTimeout(() => setVisible(false), getIntroDuration(true));
      }
    };
    preference.addEventListener("change", onPreferenceChange);
    return () => {
      window.clearTimeout(timer);
      preference.removeEventListener("change", onPreferenceChange);
    };
  }, []);

  // Auth and the real app load underneath; restore access after completion.
  useEffect(() => {
    if (!visible) return;
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement;
    const scene = document.querySelector<HTMLElement>(".launch-intro");
    const siblings = Array.from(scene?.parentElement?.children ?? []).filter(
      (element): element is HTMLElement =>
        element instanceof HTMLElement && element !== scene && element.tagName !== "SCRIPT",
    );
    const inertStates = siblings.map((element) => element.inert);
    siblings.forEach((element) => {
      element.inert = true;
    });
    document.body.style.overflow = "hidden";
    scene?.focus({ preventScroll: true });
    return () => {
      document.body.style.overflow = previousOverflow;
      siblings.forEach((element, index) => {
        element.inert = inertStates[index] ?? false;
      });
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      className="launch-intro"
      role="dialog"
      aria-modal="true"
      aria-label="BharatChat opening"
      data-testid="launch-intro"
      data-motion={reducedMotion ? "reduced" : "full"}
      tabIndex={-1}
    >
      <div className="intro-particles" aria-hidden="true">
        {Array.from({ length: 12 }, (_, index) => (
          <i key={index} />
        ))}
      </div>
      <div className="intro-brand">
        <div className="intro-wordmark-stage">
          <h1>
            Bharat<span>Chat</span>
          </h1>
          <div className="intro-sweep" aria-hidden="true" />
        </div>
        <p className="intro-tagline">INDIA’S TRUSTED PLATFORM</p>
      </div>
    </div>
  );
}
