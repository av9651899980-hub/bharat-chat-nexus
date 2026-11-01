import { describe, it, expect } from "vitest";
import { usernameSuggestions, googleProfileSchema } from "./google-account";

describe("username suggestions", () => {
  it("returns up to 4 unique valid handles", () => {
    const s = usernameSuggestions("Ashutosh Vishwakarma", "ashutoshvishwakarma5230@gmail.com");
    expect(s.length).toBe(4);
    expect(new Set(s).size).toBe(4);
    expect(s[0]).toBe("ashutosh_v");
    s.forEach((u) => expect(googleProfileSchema.shape.username.safeParse(u).success).toBe(true));
  });
  it("usernames are compared lowercase", () => {
    expect(googleProfileSchema.shape.username.parse("Ashu_V")).toBe("ashu_v");
  });
});
