import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import { usernameSuggestions, googleProfileSchema } from "./google-account";

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
