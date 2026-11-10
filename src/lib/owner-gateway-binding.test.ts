import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import { gatewayBindingMatches } from "./owner-gateway-binding";

describe("owner gateway session binding", () => {
  const binding = {
    userId: "owner-1",
    tokenFingerprint: "token-hash-a",
    expectedUserId: "owner-1",
    expectedTokenFingerprint: "token-hash-a",
    expiresAt: 2000,
    now: 1000,
  };

  it("accepts only the same authenticated user and bearer token before expiry", () => {
    assert.equal(gatewayBindingMatches(
      binding.userId,
      binding.tokenFingerprint,
      binding.expectedUserId,
      binding.expectedTokenFingerprint,
      binding.expiresAt,
      binding.now,
    ), true);
  });

  it("rejects another user, another token, and expired capabilities", () => {
    assert.equal(gatewayBindingMatches("other-user", binding.tokenFingerprint, binding.expectedUserId, binding.expectedTokenFingerprint, binding.expiresAt, binding.now), false);
    assert.equal(gatewayBindingMatches(binding.userId, "token-hash-b", binding.expectedUserId, binding.expectedTokenFingerprint, binding.expiresAt, binding.now), false);
    assert.equal(gatewayBindingMatches(binding.userId, binding.tokenFingerprint, binding.expectedUserId, binding.expectedTokenFingerprint, binding.now, binding.now), false);
  });
});