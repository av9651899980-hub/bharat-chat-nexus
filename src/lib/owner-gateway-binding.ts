/** Compare an authenticated request with the owner gateway's short-lived binding. */
export function gatewayBindingMatches(
  userId: string,
  tokenFingerprint: string,
  expectedUserId: string,
  expectedTokenFingerprint: string,
  expiresAt: number,
  now: number,
) {
  return (
    userId === expectedUserId &&
    tokenFingerprint === expectedTokenFingerprint &&
    Number.isFinite(expiresAt) &&
    expiresAt > now
  );
}