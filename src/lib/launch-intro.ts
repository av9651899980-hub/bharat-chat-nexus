export const INTRO_DURATION_MS = 8000;
export const INTRO_STORAGE_KEY = "bharatchat.core-awakening.seen";

export function shouldShowIntro(hasSeen: boolean, reducedMotion: boolean) {
  return !hasSeen && !reducedMotion;
}