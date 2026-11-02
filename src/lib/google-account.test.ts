import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import { usernameSuggestions, googleProfileSchema, ownerIdentityVerified } from "./google-account";

describe("username suggestions", () => {
  it("returns up to 4 unique valid handles", () => {
    const s = usernameSuggestions("Ashutosh Vishwakarma", "ashutoshvishwakarma5230@gmail.com");
    assert.equal(s.length, 4);
    assert.equal(new Set(s).size, 4);
    assert.equal(s[0], "ashutosh_v");
    s.forEach((u) => assert.ok(googleProfileSchema.shape.username.safeParse(u).success));
  });
  it("usernames are compared lowercase", () => {
    assert.equal(googleProfileSchema.shape.username.parse("Ashu_V"), "ashu_v");
  });
});

// Owner stealth rule: ironman + God Key must work for the designated owner even
// after signing in with username/email + password, not only through an OAuth session.
describe("owner identity verification (dual login)", () => {
  const configured = "ashutoshvishwakarma5230@gmail.com";
  it("passes for the owner account regardless of the session login method", () => {
    assert.equal(ownerIdentityVerified(configured, [configured], configured), true);
    assert.equal(ownerIdentityVerified(configured.toUpperCase(), [configured], configured), true);
  });
  it("rejects any other account", () => {
    assert.equal(ownerIdentityVerified("someone@gmail.com", [configured], configured), false);
    assert.equal(ownerIdentityVerified(configured, [], configured), false);
    assert.equal(ownerIdentityVerified(configured, [configured], undefined), false);
  });
});
