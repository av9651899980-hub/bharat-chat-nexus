export const INTRO_DURATION_MS = 9000;
export const REDUCED_INTRO_DURATION_MS = 1200;

export function getIntroDuration(reducedMotion: boolean) {
  return reducedMotion ? REDUCED_INTRO_DURATION_MS : INTRO_DURATION_MS;
}
